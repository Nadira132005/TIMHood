"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServicesScreen = ServicesScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var ScreenContainer_1 = require("../../../shared/ui/ScreenContainer");
var SectionCard_1 = require("../../../shared/ui/SectionCard");
function ServicesScreen() {
    return (<ScreenContainer_1.ScreenContainer>
      <SectionCard_1.SectionCard title="Services">
        <react_native_1.Text>Non-urgent structured requests in one community with applicant selection.</react_native_1.Text>
      </SectionCard_1.SectionCard>
      <SectionCard_1.SectionCard title="MVP Rule">
        <react_native_1.Text>Creator selects one helper only.</react_native_1.Text>
      </SectionCard_1.SectionCard>
    </ScreenContainer_1.ScreenContainer>);
}
