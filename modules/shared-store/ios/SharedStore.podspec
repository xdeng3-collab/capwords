Pod::Spec.new do |s|
  s.name           = 'SharedStore'
  s.version        = '1.0.0'
  s.summary        = 'Keychain-backed store shared between CapWords and its widget.'
  s.description    = 'Writes a small snapshot into a shared keychain access group so the widget extension can read it without App Groups.'
  s.license        = 'MIT'
  s.author         = 'CapWords'
  s.homepage       = 'https://github.com/xdeng3-collab/capwords'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.4'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
