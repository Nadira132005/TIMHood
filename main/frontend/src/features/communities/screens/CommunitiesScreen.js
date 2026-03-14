"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunitiesScreen = CommunitiesScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var ScreenContainer_1 = require("../../../shared/ui/ScreenContainer");
var SectionCard_1 = require("../../../shared/ui/SectionCard");
function CommunitiesScreen() {
    return (<ScreenContainer_1.ScreenContainer>
      <SectionCard_1.SectionCard title="Communities">
        <react_native_1.Text>Open or restricted communities, waiting room, and moderation settings.</react_native_1.Text>
      </SectionCard_1.SectionCard>
      <SectionCard_1.SectionCard title="Scaffold Focus">
        <react_native_1.Text>Implement membership states, invites, and access-policy awareness.</react_native_1.Text>
      </SectionCard_1.SectionCard>
    </ScreenContainer_1.ScreenContainer>);
}
