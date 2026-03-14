"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileScreen = ProfileScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var ScreenContainer_1 = require("../../../shared/ui/ScreenContainer");
var SectionCard_1 = require("../../../shared/ui/SectionCard");
function ProfileScreen() {
    return (<ScreenContainer_1.ScreenContainer>
      <SectionCard_1.SectionCard title="Profile">
        <react_native_1.Text>Onboarding answers, visibility controls, and soft social matching.</react_native_1.Text>
      </SectionCard_1.SectionCard>
      <SectionCard_1.SectionCard title="Riddles">
        <react_native_1.Text>Daily community and interest riddles are optional feature modules.</react_native_1.Text>
      </SectionCard_1.SectionCard>
    </ScreenContainer_1.ScreenContainer>);
}
