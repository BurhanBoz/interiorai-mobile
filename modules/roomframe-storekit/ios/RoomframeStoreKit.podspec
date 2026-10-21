Pod::Spec.new do |s|
  s.name           = 'RoomframeStoreKit'
  s.version        = '1.0.0'
  s.summary        = 'Read-only StoreKit 2 transaction bridge for Roomframe AI'
  s.description    = 'Lists unfinished StoreKit transactions and current entitlements so the server can settle a payment Apple took even when RevenueCat could not record it.'
  s.author         = 'Roomframe AI'
  s.homepage       = 'https://roomframeai.com'
  s.license        = { :type => 'Proprietary' }
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = '**/*.{h,m,mm,swift,hpp,cpp}'
end
