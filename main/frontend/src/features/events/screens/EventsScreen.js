"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsScreen = EventsScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var ScreenContainer_1 = require("../../../shared/ui/ScreenContainer");
var SectionCard_1 = require("../../../shared/ui/SectionCard");
function EventsScreen() {
    return (<ScreenContainer_1.ScreenContainer>
      <SectionCard_1.SectionCard title="Events">
        <react_native_1.Text>Event origin community, share approvals, and moderated participation requests.</react_native_1.Text>
      </SectionCard_1.SectionCard>
      <SectionCard_1.SectionCard title="Rule">
        <react_native_1.Text>Users request to participate; they never join directly.</react_native_1.Text>
      </SectionCard_1.SectionCard>
    </ScreenContainer_1.ScreenContainer>);
}
