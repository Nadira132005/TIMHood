"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PingsScreen = PingsScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var ScreenContainer_1 = require("../../../shared/ui/ScreenContainer");
var SectionCard_1 = require("../../../shared/ui/SectionCard");
function PingsScreen() {
    return (<ScreenContainer_1.ScreenContainer>
      <SectionCard_1.SectionCard title="Pings">
        <react_native_1.Text>Urgent short-lived requests with WILL HELP responses and visible count.</react_native_1.Text>
      </SectionCard_1.SectionCard>
      <SectionCard_1.SectionCard title="Rule">
        <react_native_1.Text>Pings only in enabled communities and by verified users.</react_native_1.Text>
      </SectionCard_1.SectionCard>
    </ScreenContainer_1.ScreenContainer>);
}
