(function () {
  "use strict";

  function binarySearch(arr, v, cmp) {
    var h = arr.length, l = -1, m;
    while (h - l > 1)
      if (cmp(arr[m = h + l >> 1], v) < 0) { 
        l = m;
      } else {
        h = m;
      }
    return h;
  }

  function isEmpty(str) {
    return (str && /^\s+$/.test(str));
  }

  function _compare(a, b) {
    return a < b;
  }


 // Establish the root object, `window` in the browser, or `global` on the server.
  var root = this;
  // holds the AVLTree c'tor
  var AVLTree = root.AVLTree;
  var SkipList = root.SkipList;
  var _ = root._;
  var async = root.async;

  // adopted from https://github.com/aduncan88/data-sync
  // credit: Adam Duncan  
  function sync (a, b, uniqueId, isDifferent, create, update, del, finalCallback) {
    // Create sets
    var aIds = _.pluck(a, uniqueId)
      , bIds = _.pluck(b, uniqueId)
      , c = _.difference(aIds, bIds)
      , d = _.intersection(aIds, bIds)
      , e = _.difference(bIds, d);

    async.parallel(
      [
        function(paraCallback) {
          // Delete omitted items
          async.forEach(
            c,
            function(index, eachCallback) {
              del(index, eachCallback);
            },
            function(error) {
              paraCallback();
            }
          );
        },
        function(paraCallback) {
          // Update only those that have changed
          async.forEach(
            d,
            function(index, eachCallback) {
              if (isDifferent(a[index], b[index])) {
                update(index, b[index], eachCallback);
              } else {
                eachCallback();
              }
            },
            function(error) {
              paraCallback();
            }
          );
        },
        function(paraCallback) {
          // Insert new items
          async.forEach(
            e,
            function(index, eachCallback) {
              create(index, b[index], eachCallback);
            },
            function(error) {
              paraCallback();
            }
          );
        }
      ],
      function() {
        finalCallback();
      }
    );
  };

  var LocalStoreIndex = function (indexedField, transform, compareFunction) {
    /// <summary>
    /// The LocalStoreIndex class is an internal helper class for the LocalStore class.
    /// </summary>
    /// <param name="indexedField" type="string">The name of the field that is being indexed</param>
    /// <param name="transform?" type="Function">
    /// <param name="compareFunction?" type="Function">
    /// The compare function is of the form: int compare(object o1, object o2);
    /// the return value is:
    ///  true if o1 < o2
    ///  else otherwise
    /// </param>
    this.indexedField = indexedField;
    this.transform = transform || function(value) { return value; };

    compareFunction = compareFunction || _compare;

    var cmpLt = function(a, b) {
      if (a.key < b.key) {
        return true;
      }
      else if (a.key === b.key) {
        return a.id < b.id;
      }

      return false;
    }
    
    this.index = new AVLTree(cmpLt);

    this.insert = function(key, value) {
      if (!key || !value) {
        throw "insert expects key and value";
      }

      key = this.transform(key);
      this.index.insert({ key: key, id: value});
    };

    this.remove = function(key, predicate) {
      if (!key) {
        throw "remove expects key";
      }

      var avlPredicate = function (node) {
        if (!predicate) return true;

        return predicate(node.value.id);
      };

      key = this.transform(key);
      this.index.remove(key, avlPredicate);
    };

    this.find = function(key) {
      key = this.transform(key);
      var node = this.index.find(key);
      return node && node.value.id;
    };

    this.getRange = function(indexKeyStart, indexKeyEnd) {
      var keys = [];

      indexKeyStart = this.transform(indexKeyStart);
      indexKeyEnd = this.transform(indexKeyEnd);

      // get the closest node which is lower
      var node = this.index.lower_bound(indexKeyStart);
      // if this node is actually lower then our start key get its successor
      if (node && this.index.cmp_lt(node.value, indexKeyStart)) {
        node = this.index.successor(node);
      }

      while(node && (this.index.cmp_lt(node.value, indexKeyEnd) || this.index.cmp_eq(node.value, indexKeyEnd))) {
        keys.push(node.value.id);
        node = this.index.successor(node);
      }

      return keys;
    }

    this.forEach = function(action) {
      action = action || function() {};

      this.index.forEach(function(value) {
        if (value && value.id) {
          action(value.id);
        }
      });
    };

    this.clear = function () {
      /// <summary>
      /// Clears the index
      /// </summary>
      this.index.clear();
    };
  };

  var SkipListLocalStoreIndex = function (indexedField, transform, compareFunction) {
    /// <summary>
    /// The LocalStoreIndex class is an internal helper class for the LocalStore class.
    /// </summary>
    /// <param name="indexedField" type="string">The name of the field that is being indexed</param>
    /// <param name="transform?" type="Function">
    /// <param name="compareFunction?" type="Function">
    /// The compare function is of the form: int compare(object o1, object o2);
    /// the return value is:
    ///  true if o1 < o2
    ///  else otherwise
    /// </param>
    this.indexedField = indexedField;
    this.transform = transform || function(value) { return value; };

    this.index = new SkipList(compareFunction);

    this.insert = function(key, value) {
      if (!key || !value) {
        throw "insert expects key and value";
      }

      key = this.transform(key);
      this.index.add(key, value);
    };

    this.remove = function(key, predicate) {
      if (!key) {
        throw "remove expects key";
      }

      key = this.transform(key);
      this.index.remove(key, predicate);
    };

    this.find = function(key) {
      key = this.transform(key);
      return this.index.getFirst(key);
    };

    this.getRange = function(indexKeyStart, indexKeyEnd) {
      var keys = [];

      indexKeyStart = this.transform(indexKeyStart);
      indexKeyEnd = this.transform(indexKeyEnd);

      return this.index.getRange(indexKeyStart, indexKeyEnd);
    }

    this.forEach = function(action) {
      action = action || function() {};

      this.index.forEach(function(value) {
        if (value) {
          action(value);
        }
      });
    };

    this.clear = function () {
      /// <summary>
      /// Clears the index
      /// </summary>
      this.index = new SkipList(compareFunction);
    };
  };

  var LocalStore = function (storageKeyPrefix, keyFieldName, storage) {
    /// <summary>
    /// The LocalStore class provides persistent local/session storage with basic indexing.
    /// </summary>
    /// <param name="storageKeyPrefix" type="string">
    /// The prefix that is going to be added to each key in the storage
    /// </param>
    /// <param name="keyFieldName" type="string">
    /// The name of the field that is going to used as a unique storage key
    /// </param>
    /// param name="storage" type="Object">
    /// <remarks>The final storage key of an object o1 will be: 
    ///                     storageKeyPrefix + ':' + o1.keyFieldName
    /// </remarks>
    this.init(storageKeyPrefix, keyFieldName, storage);
  };

  // Export LocalStore for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `LocalStore` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      AVLTree = require('./avltree').AVLTree;
      SkipList = require('./SkipList').SkipList;
      _ = require('./underscore-min');
      async = require('./async.min');
      exports = module.exports
    }
    exports.LocalStore = LocalStore;
  } else {
    root['LocalStore'] = LocalStore;
  }  

  LocalStore.prototype = {
    storage: null,
    storageKeyPrefix: null,
    keyFieldName: null,
    indexCollection: {},
    init: function (storageKeyPrefix, keyFieldName, storage) {
      /// <summary>
      /// Initializes the store
      /// </summary>
      /// <remarks>Called from the constructor</remarks>
      /// <param name="storageKeyPrefix" type="string">
      /// The prefix that is going to be added to each key in the storage
      /// </param>
      /// <param name="keyFieldName" type="string">
      /// The name of the field that is going to used as a unique storage key
      /// </param>
      /// <param name="storage" type="Object">
      /// The storage engine to use conforming to HTML5 localStorage interface
      /// </param>
      if (storageKeyPrefix === null || storageKeyPrefix === undefined || isEmpty(storageKeyPrefix)) {
        throw "storageKeyPrefix must not be empty. " +
            "The storageKeyPrefix parameter will be used to prefix keys in the storage. " +
            "Please provide a unique prefix";
      }

      if (keyFieldName === null || keyFieldName === undefined || isEmpty(keyFieldName)) {
        throw "keyFieldName must not be empty. " +
            "The keyFieldName parameter will be used to store objects. " +
            "Please provide the name of the field that will be used a unique key";
      }

      if (!storage) {
        throw "Please provide a storage engine conforming to HTML5 localStorage interface";
      }

      this.storage = storage;

      this.storageKeyPrefix = storageKeyPrefix;
      this.keyFieldName = keyFieldName;

      this.generateKey = function (key) {
        return this.storageKeyPrefix + ":" + key;
      };

      this.getKeyFromItem = function (item) {
          return this.generateKey(item[this.keyFieldName]);
      };
    },
    addOrUpdate: function (item) {
      /// <summary>
      /// Adds or updates an item in the store
      /// </summary>
      /// <param name="item" type="Object">
      /// The item is added to the store or is updated if it is already in the store
      /// </param>

      if (!item) return;

      var key = this.getKeyFromItem(item);

      // first remove the item if it is already in the store
      this.removeByKey(item[this.keyFieldName]);

      // add to the storage
      this.storage.setItem(key, JSON.stringify(item));

      // add to the indices
      _.each(this.indexCollection, function (ind) {
        // add the item to the index only if it has the indexed field
        if (item.hasOwnProperty(ind.indexedField)) {
            ind.insert(item[ind.indexedField], key);
        }
      });
    },
    removeByKey: function (key) {
      /// <summary>
      /// Removes an item from the store
      /// </summary>
      /// <param name="key" type="string">The key of the item to remove from the store</param>
      var storageKey = this.generateKey(key),
          item = this.storage.getItem(storageKey), // get the item so it can be removed from the indices as well          
          predicate;

      if (item === null || item === undefined) {
        return;
      }

      item = JSON.parse(item);

      // remove item from the storage
      this.storage.removeItem(storageKey);

      // a predicate to uniquely identify an object inside an index
      predicate = function (value) {
        return value === storageKey;
      };

      // remove from the indices
      _.each(this.indexCollection, function (ind) {
        ind.remove(item[ind.indexedField], predicate);
      });
    },
    remove: function (item) {
      /// <summary>
      /// Removes an item from the store
      /// </summary>
      /// <param name="item" type="Object">The item to remove from the store</param>
      this.removeByKey(item[this.keyFieldName]);
    },
    clear: function () {
      /// <summary>
      /// Clears the entire store
      /// </summary>

      // clear storage
      // delete all keys starting with our storage prefix            
      var keys = [],
          self = this,
          i;

      self.storageEach(function (key) {
        keys.push(key);
      });
      for (i = 0; i < keys.length; i++) {
        // delete from the storage
        self.storage.removeItem(keys[i]);
      }

      // clear indices
      // remove from the indices
      _.each(this.indexCollection, function (ind) {
        ind.clear();
      });
    },
    get: function (key) {
      /// <summary>
      /// Retrieves an item from the Store by its unique key
      /// </summary>
      /// <param name="key" type="string">The key of the item to retrieve from the store</param>
      /// <returns type="Object">The associated item</returns>
      var item = this.storage.getItem(this.generateKey(key));
      if (item === null || item === undefined) {
        return null;
      }

      return item;
    },
    contains: function (key) {
      /// <summary>
      /// Checks whether an item corresponding to the given unique key exists in the store
      /// </summary>
      /// <param name="key" type="string">The key of the item to check</param>
      /// <returns type="Boolean">true if it exists, false otherwise</returns>
      return !!this.storage.getItem(this.generateKey(key));
    },
    addIndex: function (indexName, indexedField, transform, compareFunction) {
      /// <summary>
      /// Adds a new index to the LocalStore
      /// </summary>
      /// <remarks>This will cause the new indexed to be created, i.e. the store will be iterated</remarks>
      /// <param name="indexName" type="string">The name of the index</param>
      /// <param name="indexedField" type="string">The name of the field that is being indexed</param>
      /// <param name="transform?" type="Function">
      /// <param name="compareFunction?" type="Function">
      /// The compare function is of the form: int compare(object o1, object o2);
      /// the return value is:
      ///  true if o1 < o2
      ///  else otherwise
      /// </param>

      // add the index to indices collection
      var ind = new SkipListLocalStoreIndex(indexedField, transform, compareFunction),
          prefixLen;

      this.indexCollection[indexName] = ind;

      // iterate over the storage and build the index
      prefixLen = this.storageKeyPrefix.length;
      this.forEach(function (key, item) {
        // add the item to the index only if it has the indexedField
        if (item.hasOwnProperty(indexedField)) {
          ind.insert(item[indexedField], key);
        }
      });
    },
    removeIndex: function (indexName) {
      /// <summary>
      /// Removes an index form the LocalStore
      /// </summary>
      /// <param name="indexName" type="string">The name of the index</param>
      delete this.indexCollection[indexName];
    },
    getFirstByIndex: function (indexName, indexKey) {
      /// <summary>
      /// Gets the first item from the index which corresponds to the given index value
      /// </summary>
      /// <param name="indexName" type="string">The name of the index</param>
      /// <param name="indexKey" type="Object">The value of the index to search for</param>
      /// <returns type="Object">the item corresponding to the searched value, empty array if none</returns>
      if (this.indexCollection.hasOwnProperty(indexName)) {
        var ind = this.indexCollection[indexName];
        var storageKey = ind.find(indexKey);

        if (!storageKey) {
          return null;
        }
        var item = this.storage.getItem(storageKey)

        return item && JSON.parse(sItem);
      }

      return null;
    },
    getRangeByIndex: function (indexName, indexKeyStart, indexKeyEnd) {
      /// <summary>
      /// Get all items from the index which corresponds to the given index value range
      /// </summary>
      /// <param name="indexName" type="string">The name of the index</param>
      /// <param name="indexKeyStart" type="Object">The value of the index beginning the range</param>
      /// <param name="indexKeyEnd" type="Object">The value of the index ending the range</param>
      /// <returns type="Array" elementType="Object">
      /// An array of items corresponding to the searched range, empty array if none
      /// </returns>

      if (this.indexCollection.hasOwnProperty(indexName)) {
        var ind = this.indexCollection[indexName];

        var keys = ind.getRange(indexKeyStart, indexKeyEnd);

        var items = [];
        var self = this;

        _.each(keys, function (key) {
          var item = self.storage.getItem(key);
          if (item) {
            items.push(JSON.parse(item));
          }
        });
        return items;
      }

      return [];
    },
    getAllByIndex: function (indexName) {
      /// <summary>
      /// Get all items ordered by the given index
      /// </summary>
      /// <param name="indexName" type="string">The name of the index</param>
      /// <returns type="Array" elementType="Object">
      /// An array of all items ordered by the index value
      /// </returns>
      var items = []
      this.forEachByIndex(indexName, function(key, item) { items.push(item); });
      return items;
    },
    map: function (mapFunction) {
      mapFunction = mapFunction || function(item) { return item; };
      var items = [];
      this.forEach(function(key, item) { items.push(mapFunction(item)); });
      return items;
    },
    mapByIndex: function (indexName, mapFunction) {
      mapFunction = mapFunction || function(item) { return item; };
      var items = [];
      this.forEachByIndex(indexName, function(key, item) { items.push(mapFunction(item)); });
      return items;
    },
    storageEach : function(callback) {
      var i;
      var storage = this.storage;
      var l = storage.length;
      var key;
      var item;
      var prefixLen = this.storageKeyPrefix.length;

      callback = callback || function () {}
      for(i = 0; i<l; i++) {
        key = storage.key(i);

        // take only items which belong to this store
        if (key.substr(0, prefixLen) === this.storageKeyPrefix) {
          item = storage.getItem(key);
          if (item) {
            callback(key, JSON.parse(item));          
          }
        } 
      }
    },
    removeFirstByIndex: function (indexName, indexKey) {
      /// <summary>
      /// Remove the first item from the index which corresponds to the given index value
      /// </summary>
      /// <param name="indexName" type="string">The name of the index</param>
      /// <param name="indexKey" type="Object">The value of the index to search for</param>

      var item = this.getFirstByIndex(indexName, indexKey);
      if (item) {
        this.remove(item);
      }
    },
    removeRangeByIndex: function (indexName, indexKeyStart, indexKeyEnd) {
      /// <summary>
      /// Remove all items from the index which corresponds to the given index value range
      /// </summary>
      /// <param name="indexName" type="string">The name of the index</param>
      /// <param name="indexKeyStart" type="object">The value of the index beginning the range</param>
      /// <param name="indexKeyEnd" type="object">The value of the index ending the range</param>

      var items = this.getRangeByIndex(indexName, indexKeyStart, indexKeyEnd),
          self = this;

      if (items && items.length > 0) {
        _.each(items, function (item) {
          self.remove(item);
        });
      }
    },
    forEach: function (action) {
      /// <summary>
      /// Perform an action on each of the items in the store
      /// </summary>
      /// <param name="action" type="Function">
      /// The action to perform. void action(string key, object item);
      /// </param>
      this.storageEach(function (key, item) {
        action(key, item);
      });
    },
    forEachByIndex: function (indexName, action) {
      /// <summary>
      /// Perform an action on each of the items in the store corresponding to a given indexed value
      /// </summary>
      /// <param name="indexName" type="string">The name of the index</param>
      /// <param name="action" type="Function">
      /// The action to perform. void action(string key, object item);
      /// </param>

      var ind = this.indexCollection[indexName];
      var storage = this.storage;

      if (ind) {
        ind.forEach(function(value) {
          var item = storage.getItem(value);
          if (item) {            
            action(value, JSON.parse(item));
          }
        });
      }
    },
    sync: function(items, idField, isUpdated, shouldDelete, callback) {
      var state = {
        created: {},
        updated: {},
        deleted: {}
      };

      shouldDelete = shouldDelete || function() { return true; };
      callback = callback || function() {};

      var self = this;
      var local = {};
      self.forEach(function(key, value) { local[value[idField]] = value; });

      var newItems = {};
      _.each(items, function(value) { newItems[value[idField]] = value; });

      var updateAction = function(key, updatedItem, cb) {
        state.updated[key] = updatedItem;
        self.addOrUpdate(updatedItem);
        cb();
      };

      var createAction = function(key, createdItem, cb) {
        state.created[key] = createdItem;
        self.addOrUpdate(createdItem);
        cb();
      };

      var deleteAction = function(key, cb) {
        var deletedItem = local[key];
        if (shouldDelete(deletedItem)) {
          state.deleted[key] = deletedItem;
          self.removeByKey(key);
        }
        cb();
      };

      sync(local, newItems, idField, isUpdated, createAction, updateAction, deleteAction, function() {
        callback(state);
      });
    }
  };

}).call(this);
