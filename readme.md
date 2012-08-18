# localSync
An html5 local storage with indexing and sync support.
* supports multiples stores
* add your own indexes (values don't have to be unique)
* automatically serialize/deserialize to JSON
* supports any storage engine which implements the [Storage interface](http://dev.w3.org/html5/webstorage/#storage-0) 
* useful helpers:
    * foreach
    * foreachByIndex
    * getFirstByIndex
    * removeFirstByIndex

works in node.js as well.
    

## Sync support
Sync support was adopted from [data-sync](https://github.com/aduncan88/data-sync).
Basically you provide an array of items that are then synced with the store.

This allows for easy syncing against REST services.

## Example

### node.js
```javascript
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
```

## Credits
* [data-sync](https://github.com/aduncan88/data-sync)
* [slgorithm.js](https://github.com/dhruvbird/algorithm-js)
 
## License
MIT
