import { createRouter, createWebHashHistory } from 'vue-router';

import Dashboard from '../views/Dashboard.vue';

const routes = [
	{
		path: '/',
		name: 'dashboard',
		component: Dashboard,
	},
	{
		path: '/users',
		name: 'users-list',
		component: () => import('../views/ListUsers.vue'),
	},
	{
		path: '/users/:username',
		name: 'user-editor',
		component: () => import('../views/EditUser.vue'),
	},
	{
		path: '/groups',
		name: 'group-editor',
		component: () => import('../views/GroupsMain.vue'),
	},
];

const router = createRouter({
	history: createWebHashHistory(),
	routes,
});

export default router;
