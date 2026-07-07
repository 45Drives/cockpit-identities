import { createApp } from 'vue';
import App from './App.vue';
import '@45drives/houston-common-css/src/index.css';
import '@45drives/houston-common-ui/style.css';

import router from './router';
import { pushNotification, Notification } from '@45drives/houston-common-ui';

const errorHandler = (error) => {
	console.error(error);
	let body = "";
	if (error instanceof Error && error?.message) {
		body = error.message;
	} else if (typeof error === "string") {
		body = error;
	} else if (error?.stderr) {
		body = error.stderr;
	} else {
		body = "An error occured, check the system console (CTRL+SHIFT+J) for more information.";
	}
	pushNotification(new Notification("System Error", body, 'error'));
}

const app = createApp(App).use(router)

app.config.errorHandler = (error) => errorHandler(error);

window.onerror = (...args) => errorHandler(args[4] ?? args[0]);

app.mount('#app');
