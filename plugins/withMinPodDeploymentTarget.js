/**
 * Raises every CocoaPods target to the app's iOS deployment target.
 *
 * Xcode 27 refuses to build a target whose IPHONEOS_DEPLOYMENT_TARGET is below 15.0
 * ("the range of supported deployment target versions is 15.0 to 27.x"), and several pods
 * still declare older ones (SDWebImage 9.0, RevenueCat 13.0, RNSVG 12.4, …). Apple requires
 * the iOS 27 SDK for uploads from April 2027 (ITMS-90725), so this is not optional.
 *
 * ios/ is not tracked in git, so the Podfile edit alone would vanish on the next
 * `expo prebuild`; this plugin re-applies it. To patch an existing ios/ without a prebuild:
 *   node plugins/withMinPodDeploymentTarget.js && (cd ios && LANG=en_US.UTF-8 pod install)
 */
const fs = require("fs");
const path = require("path");

const MARK = "# min-pod-deployment-target";
const SNIPPET = `
    ${MARK} (plugins/withMinPodDeploymentTarget.js): Xcode 27 rejects targets below iOS 15.0
    min_ios = Gem::Version.new(podfile_properties['ios.deploymentTarget'] || '15.1')
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |cfg|
        current = cfg.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if current.nil? || Gem::Version.new(current) < min_ios
          cfg.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = min_ios.to_s
        end
      end
    end
`;

function patchPodfile(podfilePath) {
    const src = fs.readFileSync(podfilePath, "utf8");
    if (src.includes(MARK)) return false;
    const anchor = /post_install do \|installer\|\n/;
    if (!anchor.test(src)) throw new Error(`post_install block not found in ${podfilePath}`);
    fs.writeFileSync(podfilePath, src.replace(anchor, (m) => m + SNIPPET));
    return true;
}

module.exports = function withMinPodDeploymentTarget(config) {
    const { withDangerousMod } = require("expo/config-plugins");
    return withDangerousMod(config, [
        "ios",
        (cfg) => {
            patchPodfile(path.join(cfg.modRequest.platformProjectRoot, "Podfile"));
            return cfg;
        },
    ]);
};

if (require.main === module) {
    const podfile = path.join(__dirname, "..", "ios", "Podfile");
    console.log(patchPodfile(podfile) ? `patched ${podfile}` : `already patched ${podfile}`);
}
