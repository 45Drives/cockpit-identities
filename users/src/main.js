import { createApp, reactive } from 'vue';
import App from './App.vue';
import './index.css';
import FIFO from './classes/FIFO';

import router from './router';

const notificationFIFO = reactive(new FIFO());

const errorHandler = (error) => {
	console.log(error);
	const notificationObj = {
		title: "System Error",
		body: "",
		show: true,
		timeout: 10000,
		actions: [],
		level: "error",
	}
	if (error instanceof Error && error?.message) {
		notificationObj.body = error.message;
	} else if (typeof error === "string") {
		notificationObj.body = error;
	} else if (error?.stderr) {
		notificationObj.body = error.stderr;
	} else {
		notificationObj.body = "An error occured, check the system console (CTRL+SHIFT+J) for more information.";
	}
	notificationFIFO.push(notificationObj);
}

const app = createApp(App, { notificationFIFO }).use(router)

app.config.errorHandler = (error) => errorHandler(error);

// window.onerror = (...args) => errorHandler(args[4] ?? args[0]);

app.mount('#app');
