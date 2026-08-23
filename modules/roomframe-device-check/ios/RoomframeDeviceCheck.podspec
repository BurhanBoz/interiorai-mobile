Pod::Spec.new do |s|
  s.name           = 'RoomframeDeviceCheck'
  s.version        = '1.0.0'
  s.summary        = 'Apple DeviceCheck token bridge for Roomframe AI'
  s.description    = 'Mints a DCDevice token so the backend can record, per physical device, that the welcome bonus was already claimed.'
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
