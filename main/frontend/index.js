import { registerRootComponent } from 'expo';

import App from './App';
import { installConsoleErrorReporter } from './src/shared/utils/install-console-error-reporter';

installConsoleErrorReporter();

registerRootComponent(App);
