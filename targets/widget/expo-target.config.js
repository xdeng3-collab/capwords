/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = () => ({
  type: 'widget',
  name: 'CapWordsWidget',
  displayName: 'CapWords',
  // Shared container: the app writes the snapshot here, the widget reads it.
  // A keychain access group rather than an App Group — App Groups require a
  // paid Apple Developer membership, this does not.
  entitlements: {
    'keychain-access-groups': ['$(AppIdentifierPrefix)com.capwordsxxx.shared'],
  },
  // containerBackground and the modern widget APIs need iOS 17.
  deploymentTarget: '17.0',
  // Mirrors COLORS in src/config.js so the widget matches the app.
  colors: {
    WidgetBackground: '#F3E9D2',
    WidgetSurface: '#FBF3E0',
    WidgetPanel: '#E8D6AE',
    WidgetOutline: '#3A2A1A',
    WidgetText: '#4A3826',
    WidgetTextLight: '#6F5A41',
    WidgetTextMuted: '#A38F6F',
    WidgetPrimary: '#C98A3B',
    WidgetPrimaryDark: '#8C5A22',
    WidgetStreak: '#E0742F',
    WidgetLeaf: '#7CB06A',
    WidgetSky: '#8FC6E8',
    WidgetSand: '#E8D6AE',
    WidgetSurfaceAlt: '#F0E2C4',
  },
});
