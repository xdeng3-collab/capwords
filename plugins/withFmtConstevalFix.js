const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo config plugin: fix the iOS build failure caused by the `fmt` library.
 *
 * React Native 0.76 bundles fmt 11.0.2, which enables `consteval`
 * (FMT_USE_CONSTEVAL=1) whenever it detects Clang >= 11. The Apple Clang that
 * ships with Xcode 26 evaluates `consteval` far more strictly, so fmt fails to
 * compile with errors such as:
 *
 *   Pods/fmt/include/fmt/format-inl.h:59:24: error: call to consteval function
 *   'fmt::basic_format_string<...>' is not a constant expression
 *
 * See https://github.com/expo/expo/issues/44229
 *
 * The fix requires two coordinated changes, injected into the Podfile's
 * `post_install` hook so they are re-applied on every `pod install`:
 *
 *   1. Guard fmt's `base.h` with `#ifndef FMT_USE_CONSTEVAL`. Upstream
 *      redefines the macro unconditionally, which silently overrides any
 *      externally supplied value.
 *   2. Inject `FMT_USE_CONSTEVAL=0` into every generated pod xcconfig, so the
 *      define reaches the compiler for all translation units that include fmt.
 *
 * Living in a config plugin (rather than a hand-edited Podfile) keeps the fix
 * under version control and makes it survive `expo prebuild --clean`.
 */

const HOOK_MARKER = '# >>> capwords: fmt consteval fix';

const RUBY_SNIPPET = `
    ${HOOK_MARKER} (see plugins/withFmtConstevalFix.js)
    # Xcode 26's Apple Clang rejects fmt 11.0.2's use of \`consteval\`.
    # Force FMT_USE_CONSTEVAL=0 so the pod compiles.
    fmt_base_header = File.join(installer.sandbox.root, 'fmt', 'include', 'fmt', 'base.h')
    if File.exist?(fmt_base_header)
      header = File.read(fmt_base_header)
      anchor = "// Detect consteval, C++20 constexpr extensions and std::is_constant_evaluated.\\n"
      if header.include?(anchor) && !header.include?('#ifndef FMT_USE_CONSTEVAL')
        header = header.sub(anchor, anchor + "#ifndef FMT_USE_CONSTEVAL\\n")
        header = header.sub(
          "#else\\n#  define FMT_USE_CONSTEVAL 0\\n#endif\\n#if FMT_USE_CONSTEVAL\\n",
          "#else\\n#  define FMT_USE_CONSTEVAL 0\\n#endif\\n#endif\\n#if FMT_USE_CONSTEVAL\\n"
        )
        begin
          File.chmod(0644, fmt_base_header)
        rescue StandardError
        end
        File.write(fmt_base_header, header)
      end
    end

    fmt_define = 'FMT_USE_CONSTEVAL=0'
    support_files_dir = File.join(installer.sandbox.root, 'Target Support Files')
    Dir.glob(File.join(support_files_dir, '**', '*.xcconfig')).each do |xcconfig_path|
      contents = File.read(xcconfig_path)
      next if contents.include?(fmt_define)
      new_contents = contents.gsub(/^GCC_PREPROCESSOR_DEFINITIONS = (.*)$/) do
        "GCC_PREPROCESSOR_DEFINITIONS = #{$1} #{fmt_define}"
      end
      unless new_contents.include?('GCC_PREPROCESSOR_DEFINITIONS')
        new_contents += "\\nGCC_PREPROCESSOR_DEFINITIONS = $(inherited) #{fmt_define}\\n"
      end
      begin
        File.write(xcconfig_path, new_contents)
      rescue StandardError
      end
    end
    # <<< capwords: fmt consteval fix
`;

function addFixToPodfile(podfile) {
  if (podfile.includes(HOOK_MARKER)) {
    return podfile;
  }

  // Insert immediately after the `react_native_post_install(...)` call so the
  // fix runs before CocoaPods finishes writing the project.
  const postInstallCall = /react_native_post_install\(\s*[\s\S]*?\n\s*\)\n/;
  const match = podfile.match(postInstallCall);

  if (match) {
    const insertAt = match.index + match[0].length;
    return podfile.slice(0, insertAt) + RUBY_SNIPPET + podfile.slice(insertAt);
  }

  // Fallback: append a standalone post_install hook.
  return `${podfile}\npost_install do |installer|${RUBY_SNIPPET}end\n`;
}

module.exports = function withFmtConstevalFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(
        cfg.modRequest.platformProjectRoot,
        'Podfile'
      );

      if (!fs.existsSync(podfilePath)) {
        return cfg;
      }

      const contents = fs.readFileSync(podfilePath, 'utf8');
      fs.writeFileSync(podfilePath, addFixToPodfile(contents), 'utf8');

      return cfg;
    },
  ]);
};
