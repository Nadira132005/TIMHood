"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostsScreen = PostsScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var ScreenContainer_1 = require("../../../shared/ui/ScreenContainer");
var SectionCard_1 = require("../../../shared/ui/SectionCard");
function PostsScreen() {
    return (<ScreenContainer_1.ScreenContainer>
      <SectionCard_1.SectionCard title="Posts">
        <react_native_1.Text>Content sharing in communities with reactions, comments, and optional polls.</react_native_1.Text>
      </SectionCard_1.SectionCard>
      <SectionCard_1.SectionCard title="Boundary">
        <react_native_1.Text>Posts are not events, pings, or services.</react_native_1.Text>
      </SectionCard_1.SectionCard>
    </ScreenContainer_1.ScreenContainer>);
}
