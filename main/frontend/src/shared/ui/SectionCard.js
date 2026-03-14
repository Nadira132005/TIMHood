"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SectionCard = SectionCard;
var react_1 = require("react");
var react_native_1 = require("react-native");
var tokens_1 = require("../theme/tokens");
function SectionCard(_a) {
    var title = _a.title, children = _a.children;
    return (<react_native_1.View style={styles.card}>
      <react_native_1.Text style={styles.title}>{title}</react_native_1.Text>
      {children}
    </react_native_1.View>);
}
var styles = react_native_1.StyleSheet.create({
    card: {
        backgroundColor: tokens_1.colors.surface,
        borderRadius: 12,
        padding: tokens_1.spacing.md,
        marginBottom: tokens_1.spacing.sm,
        borderWidth: 1,
        borderColor: tokens_1.colors.border
    },
    title: {
        color: tokens_1.colors.text,
        fontWeight: '700',
        marginBottom: tokens_1.spacing.xs
    }
});
