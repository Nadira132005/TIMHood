"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScreenContainer = ScreenContainer;
var react_1 = require("react");
var react_native_1 = require("react-native");
var tokens_1 = require("../theme/tokens");
function ScreenContainer(_a) {
    var children = _a.children;
    return (<react_native_1.SafeAreaView style={styles.safe}>
      <react_native_1.View style={styles.body}>{children}</react_native_1.View>
    </react_native_1.SafeAreaView>);
}
var styles = react_native_1.StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: tokens_1.colors.bg
    },
    body: {
        flex: 1,
        padding: tokens_1.spacing.md
    }
});
