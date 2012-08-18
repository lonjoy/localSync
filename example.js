var _ = require('./underscore-min');
var async = require('./async.min');
var LocalStore = require('./LocalStore').LocalStore;
var localStorage = require('./localStorage');

timeStore = new LocalStore('timeStore', 'id',  localStorage);
timeStore.addIndex('time', 'timestamp');

timeStore.addOrUpdate({ id: '2', timestamp: 2 });
timeStore.addOrUpdate({ id: '1', timestamp: 1 });
timeStore.forEachByIndex('time', function(value) {
  console.log(value);
});

// { id: '1', timestamp: 1 }
// { id: '2', timestamp: 2 }


