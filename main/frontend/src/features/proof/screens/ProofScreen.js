"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProofScreen = ProofScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var ScreenContainer_1 = require("../../../shared/ui/ScreenContainer");
var SectionCard_1 = require("../../../shared/ui/SectionCard");
function ProofScreen() {
    return (<ScreenContainer_1.ScreenContainer>
      <SectionCard_1.SectionCard title="Document Number Proof">
        <react_native_1.Text>Submit document number once to unlock verified-only actions.</react_native_1.Text>
      </SectionCard_1.SectionCard>
      <SectionCard_1.SectionCard title="Rule">
        <react_native_1.Text>Proof submission is one-time and cannot be repeated after success.</react_native_1.Text>
      </SectionCard_1.SectionCard>
      <SectionCard_1.SectionCard title="Locations">
        <react_native_1.Text>Save home pin (required) and work pin (optional) for restricted communities.</react_native_1.Text>
      </SectionCard_1.SectionCard>
    </ScreenContainer_1.ScreenContainer>);
}
