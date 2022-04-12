<template>
	<div class="flex flex-col">
		<div class="-my-2 -mx-4 sm:-mx-6 lg:-mx-8">
			<div class="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
				<div class="shadow md:rounded-[9px] border border-default">
					<div
						class="md:rounded-t-[8px] bg-accent py-3 px-3 lg:pl-8 lg:pr-6 overflow-hidden text-sm font-semibold flex flex-row"
					>
						<div class="grow">
							<slot name="header">
								<span class="text-header">{{ headerText }}</span>
							</slot>
						</div>
						<div class="overflow-y-auto" style="scrollbar-gutter: stable;"></div>
					</div>
					<div
						:class="[noShrink ? 'h-80' : 'max-h-80', 'flex flex-col overflow-y-scroll md:rounded-b-[8px]']"
						style="scrollbar-gutter: stable;"
					>
						<table class="min-w-full divide">
							<thead :class="[stickyHeaders ? 'use-sticky' : '']">
								<slot name="thead" />
							</thead>
							<tbody class="bg-default w-full">
								<slot name="tbody">
									<tr>
										<td colspan="100%" class="text-center align-middle text-muted text-sm">{{ emptyText }}</td>
									</tr>
								</slot>
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
export default {
	props: {
		headerText: {
			type: String,
			required: false,
			default: "Table",
		},
		emptyText: {
			type: String,
			required: false,
			default: "Nothing to show.",
		},
		noShrink: {
			type: Boolean,
			required: false,
			default: false,
		},
		stickyHeaders: {
			type: Boolean,
			required: false,
			default: false,
		}
	}
}
</script>

<style>
@import "../index.css";

thead.use-sticky tr th {
	@apply sticky z-10 top-0;
}

th,
td {
	@apply py-2 px-3 lg:pl-8 lg:pr-6 whitespace-nowrap text-sm text-left;
}

th {
	@apply bg-accent font-semibold;
}

tr {
	@apply even:bg-accent;
}
</style>
