/*global Vue, todoStorage */

(function (exports) {

	'use strict';

	var filters = {
		all: function (todos) {
			return todos;
		},
		active: function (todos) {
			return todos.filter(function (todo) {
				return !todo.completed;
			});
		},
		completed: function (todos) {
			return todos.filter(function (todo) {
				return todo.completed;
			});
		}
	};

	var randomId = function () {
		return Math.random().toString(36).substr(2, 9);
	}

	exports.app = new Vue({

		// the root element that will be compiled
		el: '.todoapp',

		// app initial state
		data: {
			todos: [],
			newTodo: '',
			editedTodo: null,
			visibility: 'all'
		},

		// computed properties
		// http://vuejs.org/guide/computed.html
		computed: {
			filteredTodos: function () {
				return filters[this.visibility](this.todos);
			},
			remaining: function () {
				return filters.active(this.todos).length;
			},
			allDone: {
				get: function () {
					return this.remaining === 0;
				},
				set: function (value) {
					const transaction = this.db.transaction('todos', 'readwrite');

					this.todos.forEach((todo) => {
						todo.completed = value;
						transaction.store.put(todo);
					});
				}
			}
		},

		// methods that implement data logic.
		// note there's no DOM manipulation here at all.
		methods: {

			pluralize: function (word, count) {
				return word + (count === 1 ? '' : 's');
			},

			addTodo: function () {
				var value = this.newTodo && this.newTodo.trim();
				if (!value) {
					return;
				}
				this.db.add('todos', { id: randomId(), title: value, completed: false });
				this.newTodo = '';
			},

			saveTodo: function (todo) {
				this.db.put('todos', todo);
			},

			removeTodo: function (todo) {
				this.db.delete('todos', todo.id);
			},

			editTodo: function (todo) {
				this.beforeEditCache = todo.title;
				this.editedTodo = todo;
			},

			doneEdit: function (todo) {
				if (!this.editedTodo) {
					return;
				}
				this.editedTodo = null;
				todo.title = todo.title.trim();
				if (todo.title) {
					this.saveTodo(todo);
				} else {
					this.removeTodo(todo);
				}
			},

			cancelEdit: function (todo) {
				this.editedTodo = null;
				todo.title = this.beforeEditCache;
			},

			removeCompleted: function () {
				const transaction = this.db.transaction('todos', 'readwrite');

				filters.completed(this.todos).forEach((todo) => {
					transaction.store.delete(todo.id);
				});
			}
		},

		async created() {
			this.db = await synceddb.openDB('test', 1, {
				upgrade(db) {
					db.createObjectStore('todos', { keyPath: 'id' });
				},
			});

			const manager = new synceddb.SyncManager(this.db, 'http://localhost:3000', {
				fetchInterval: 5000
			});

			manager.start();

			this.query = new synceddb.LiveQuery(['todos'], async () => {
				this.todos = await this.db.getAll('todos');
			});

			await this.query.run();
		},

		unmounted() {
			this.query.close();
		},

		// a custom directive to wait for the DOM to be updated
		// before focusing on the input field.
		// http://vuejs.org/guide/custom-directive.html
		directives: {
			'todo-focus': function (el, binding) {
				if (binding.value) {
					el.focus();
				}
			}
		}
	});

})(window);
