Pod::Spec.new do |s|
  s.name           = 'StoreKitBilling'
  s.version        = '1.0.0'
  s.summary        = 'StoreKit 2 purchases and entitlements for CapWords.'
  s.description    = 'Loads products, runs purchases, and reports current entitlements so a subscription survives reinstalls without an account system.'
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
