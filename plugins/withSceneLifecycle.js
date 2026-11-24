/**
 * The UIScene life cycle, for builds made with Xcode 27 / the iOS 27 SDK.
 *
 * An app linked against the iOS 27 SDK that does not adopt scenes does not launch on iOS 27:
 * UIKit asserts at startup ("UIScene life cycle is required for apps built with this SDK",
 * `_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`). Expo SDK 54's AppDelegate
 * template makes its own window in didFinishLaunching; Expo only generates scenes from SDK 58.
 * Until this app is on that SDK, this plugin does it:
 *
 *   1. Info.plist: a UIApplicationSceneManifest with one window scene, delegate `SceneDelegate`.
 *   2. SceneDelegate.swift: makes the window, starts React Native in it, hands it to the
 *      AppDelegate (expo-system-ui reads `delegate.window`), and routes links:
 *        - a cold-start custom-scheme URL or universal link → React Native's launchOptions,
 *          where Linking.getInitialURL reads it;
 *        - a URL or universal link while running → the AppDelegate's own handlers, so
 *          RCTLinkingManager and Expo's subscribers see exactly what they saw before.
 *   3. AppDelegate.swift: the window creation and startReactNative leave didFinishLaunching.
 *      The factory is still made there (SceneDelegate uses it).
 *
 * Notification taps are untouched: expo-notifications is the UNUserNotificationCenter delegate,
 * which does not depend on the app or scene life cycle.
 *
 * Idempotent, and refuses loudly when the AppDelegate is not the template it knows.
 * The same file lives in interiorai-mobile, dropframe-mobile and real-drape-mobile.
 */
const fs = require('fs');
const path = require('path');
const { withAppDelegate, withInfoPlist, withXcodeProject, IOSConfig } = require('expo/config-plugins');

const MARKER = 'window is made by SceneDelegate';

const SCENE_DELEGATE = `import Expo
import React
import UIKit

/// The one window scene (iOS 27 SDK: no scene life cycle, no launch). Written by
/// plugins/withSceneLifecycle.js — edit the plugin, not this file.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let factory = appDelegate.reactNativeFactory else { return }
    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: Self.launchOptions(from: connectionOptions))
  }

  // A link while the app is running: the AppDelegate's handler, as before scenes.
  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }
    for context in URLContexts {
      var options: [UIApplication.OpenURLOptionsKey: Any] = [.openInPlace: context.options.openInPlace]
      if let source = context.options.sourceApplication { options[.sourceApplication] = source }
      if let annotation = context.options.annotation { options[.annotation] = annotation }
      _ = appDelegate.application(UIApplication.shared, open: context.url, options: options)
    }
  }

  // A universal link while the app is running.
  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }
    _ = appDelegate.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
  }

  /// A link that launched the app arrives here, not in didFinishLaunching. React Native's
  /// Linking.getInitialURL reads it from launchOptions, in the shape UIKit used to give it.
  private static func launchOptions(
    from options: UIScene.ConnectionOptions
  ) -> [UIApplication.LaunchOptionsKey: Any] {
    var launch: [UIApplication.LaunchOptionsKey: Any] = [:]
    if let url = options.urlContexts.first?.url {
      launch[.url] = url
    }
    if let activity = options.userActivities.first(where: { $0.activityType == NSUserActivityTypeBrowsingWeb }) {
      launch[.userActivityDictionary] = [
        UIApplication.LaunchOptionsKey.userActivityType.rawValue: activity.activityType,
        "UIApplicationLaunchOptionsUserActivityKey": activity,
      ] as [String: Any]
    }
    return launch
  }
}
`;

const TEMPLATE_WINDOW = /#if os\(iOS\) \|\| os\(tvOS\)\s*\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\s*\n\s*factory\.startReactNative\(\s*\n\s*withModuleName: "main",\s*\n\s*in: window,\s*\n\s*launchOptions: launchOptions\)\s*\n#endif/;

function withSceneManifest(config) {
  return withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    };
    return cfg;
  });
}

function withoutAppDelegateWindow(config) {
  return withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language !== 'swift') {
      throw new Error('withSceneLifecycle: expected a Swift AppDelegate');
    }
    const source = cfg.modResults.contents;
    if (source.includes(MARKER)) return cfg;
    if (!TEMPLATE_WINDOW.test(source)) {
      throw new Error(
        'withSceneLifecycle: AppDelegate.swift is not the Expo 54 template (window + startReactNative ' +
          'block not found). Move the window into SceneDelegate by hand and update this plugin.',
      );
    }
    cfg.modResults.contents = source.replace(
      TEMPLATE_WINDOW,
      `    // The ${MARKER} (plugins/withSceneLifecycle.js): the iOS 27 SDK\n` +
        '    // refuses to launch an app without the scene life cycle.',
    );
    return cfg;
  });
}

function withSceneDelegateFile(config) {
  return withXcodeProject(config, (cfg) => {
    const projectName = IOSConfig.XcodeUtils.getProjectName(cfg.modRequest.projectRoot);
    const relative = `${projectName}/SceneDelegate.swift`;
    fs.writeFileSync(path.join(cfg.modRequest.platformProjectRoot, relative), SCENE_DELEGATE);
    if (!cfg.modResults.hasFile(relative)) {
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
        filepath: relative,
        groupName: projectName,
        project: cfg.modResults,
      });
    }
    return cfg;
  });
}

module.exports = function withSceneLifecycle(config) {
  return withSceneDelegateFile(withoutAppDelegateWindow(withSceneManifest(config)));
};
module.exports.SCENE_DELEGATE = SCENE_DELEGATE;
