"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = App;
var expo_status_bar_1 = require("expo-status-bar");
var AppShell_1 = require("./src/app/AppShell");
function App() {
    return (<>
      <expo_status_bar_1.StatusBar style="dark"/>
      <AppShell_1.AppShell />
    </>);
}
