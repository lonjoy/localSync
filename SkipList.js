(function() {
  "use strict";

  // Establish the root object, `window` in the browser, or `global` on the server.
  var root = this;

  var cProb = 0.5,
    cMaxLevel = 6;

  function isNullOrUndefined(obj) {
    if (obj === null || obj === undefined) {
      return true;
    }

    return false;
  }

  var SkipNode = function(key, value) {
      /// <summary>
      /// The SkipNode class is an internal helper class for the SkipList class.
      /// </summary>
      /// <field name="key" type="Object">The node's key</field>
      /// <field name="value" type="Object">The node's value</field>
      /// <field name="nodes" type="Array" elementType="SkipNode">
      /// The skip list "skip" array
      /// </field>
      this.key = key;
      this.value = value;
      this.nodes = [];
      this.prev = null;
    };

  SkipNode.prototype = {
    getNext: function(out) {
      /// <summary>
      /// gets the next item following this node
      /// </summary>
      /// <param name="out" type="Object">Out parameter, gets the actual next SkipList node element</param>
      /// <returns type="Object">the next item value following the given node</returns>
      var nextNode = this.nodes[0];

      if (out) {
        out.nextNode = nextNode;
      }

      if (nextNode) {
        return nextNode.value;
      }

      return null;
    },
    getPrevious: function(out) {
      /// <summary>
      /// gets the item previous this node
      /// </summary>
      /// <param name="out" type="Object">Out parameter, gets the actual previous SkipList node element</param>
      /// <returns type="Object">the previous item value for the given node</returns>
      var prevNode = this.prev;

      if (out) {
        out.prevNode = prevNode;
      }

      if (prevNode) {
        return prevNode.value;
      }

      return null;
    }
  };

  var SkipList = function(compare) {
      /// <summary>
      /// The SkipList class provides simple indexing with O(log n) insertions, deletions and search.
      /// </summary>
      /// <param name="compare" type="Function" optional="true">
      /// The compare function is of the form: int compare(object o1, object o2);
      /// the return value is:
      /// -1 if o1 < o2
      ///  0 if o1 == o2
      ///  1 if o1 > o2 
      /// </param>
      /// <field type="Number" integer="true">
      /// A readonly property holding the current number of items in the list
      /// </field>
      // if we don't have a compare function use the basic one.
      if (isNullOrUndefined(compare)) {
        this.compare = function(first, second) {
          if (first < second) {
            return -1;
          }
          if (first > second) {
            return 1;
          }
          return 0;
        };
      } else {
        this.compare = compare;
      }

      this.init();
    };

  // Export SkipList for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `SkipList` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports
    }
    exports.SkipList = SkipList;
  } else {
    root['SkipList'] = SkipList;
  }

  SkipList.prototype = {
    // skip list header
    header: null,
    count: 0,
    // the current level of the skip list
    level: 0,
    // inits the skip list
    init: function() {
      this.header = new SkipNode(null, null);
    },
    randomLevel: function() {
      /// <summary>
      /// generate a random level
      /// </summary>
      /// <returns type="Number" integer="true">the level generated</returns>
      var level = 0;

      while (Math.random() < cProb && level < cMaxLevel) {
        level++;
      }

      return level;
    },
    contains: function(key) {
      /// <summary>
      /// checks whether the given key exists in the list
      /// </summary>
      /// <param name="key" type="Object">the key to search</param>
      /// <returns type="Boolean">true if there is an item with the given key</returns>
      var node = this.header,
        i = 0;

      for (i = this.level; i >= 0; i--) {
        while (!isNullOrUndefined(node.nodes[i]) && this.compare(node.nodes[i].key, key) < 0) {
          node = node.nodes[i];
        }
      }
      node = node.nodes[0];

      if (!isNullOrUndefined(node) && this.compare(node.key, key) === 0) {
        return true;
      }

      return false;
    },
    add: function(key, value) {
      /// <summary>
      /// Adds an item to the SkipList
      /// </summary>
      /// <param name="key" type="Object">the key of the item we are adding</param>
      /// <param name="value" type="Object">the item to add</param>
      var node = this.header,
        update = [],
        i, level;

      for (i = this.level; i >= 0; i--) {
        while (!isNullOrUndefined(node.nodes[i]) && this.compare(node.nodes[i].key, key) < 0) {
          node = node.nodes[i];
        }
        update[i] = node;
      }

      level = this.randomLevel();

      if (level > this.level) {
        for (i = this.level + 1; i <= level; i++) {
          update[i] = this.header;
        }
        this.level = level;
      }

      node = new SkipNode(key, value);
      for (i = 0; i <= level; i++) {
        node.nodes[i] = update[i].nodes[i];
        update[i].nodes[i] = node;
      }

      // set the previous node on level 0
      node.prev = update[0];
      if (node.nodes[0]) {
        node.nodes[0].prev = node;
      }

      this.count++;

      return node;
    },
    remove: function(key, predicate) {
      /// <summary>
      /// Remove an item from the SkipList
      /// </summary>
      /// <param name="key" type="Object">the key of the item we are removing</param>
      /// <param name="predicate" type="Function" optional="true">
      /// An optional predicate function of the form: bool predicate(object o);
      /// The function is used to determine which item to delete. 
      /// Since there could be multiple items with the same key.
      /// </param>
      /// <remarks>if a predicate is not given the "True" predicate is used</remarks>
      var node = this.header,
        update = [],
        i;

      for (i = this.level; i >= 0; i--) {
        while (!isNullOrUndefined(node.nodes[i]) && this.compare(node.nodes[i].key, key) < 0) {
          node = node.nodes[i];
        }
        update[i] = node;
      }
      node = node.nodes[0];

      while (!isNullOrUndefined(node) && this.compare(node.key, key) === 0) {
        if (isNullOrUndefined(predicate) || predicate(node.value)) {

          for (i = 0; i <= this.level; i++) {
            if (update[i].nodes[i] !== node) {
              break;
            }
            update[i].nodes[i] = node.nodes[i];
          }

          if (node.nodes[0]) {
            node.nodes[0].prev = update[0];
          }

          node = null;
          while (this.level > 0 && isNullOrUndefined(this.header.nodes[this.level])) {
            this.level--;
          }

          this.count--;

          break;
        }

        // predicate returned false skip to next node
        for (i = 0; i <= this.level; i++) {
          if (update[i].nodes[i] !== node) {
            break;
          }
          update[i] = node;
        }
        node = node.nodes[0];
      }
    },
    getFirst: function(key, out) {
      /// <summary>
      /// gets the first item with the given key
      /// </summary>
      /// <param name="key" type="Object">the key to search</param>
      /// <param name="out" type="Object">Out parameter, gets the actual SkipList node element</param>
      /// <returns type="Object">the first item corresponding to the key</returns>
      var node = this.header,
        i;


      for (i = this.level; i >= 0; i--) {
        while (!isNullOrUndefined(node.nodes[i]) && this.compare(node.nodes[i].key, key) < 0) {
          node = node.nodes[i];
        }
      }
      node = node.nodes[0];

      if (out) {
        out.node = node;
      }

      if (!isNullOrUndefined(node) && this.compare(node.key, key) === 0) {
        return node.value;
      }

      return null;
    },
    getRange: function(keyStart, keyEnd) {
      /// <summary>
      /// gets the all the items which keys are in the given range
      /// </summary>
      /// <param name="keyStart" type="Object">the lower inclusive end of the key range to search</param>
      /// <param name="keyEnd" type="Object">the higher inclusive end of the key range to search</param>
      /// <returns type="Array" elementType="Object">
      /// all items with keys resigning in the given range
      /// </returns>
      var elements = [],
        node = this.header,
        i;

      for (i = this.level; i >= 0; i--) {
        while (!isNullOrUndefined(node.nodes[i]) && this.compare(node.nodes[i].key, keyStart) < 0) {
          node = node.nodes[i];
        }
      }

      node = node.nodes[0];

      while (!isNullOrUndefined(node) && this.compare(node.key, keyEnd) <= 0) {
        elements.push(node.value);
        node = node.nodes[0];
      }

      return elements;
    },
    getAll: function(key) {
      /// <summary>
      /// gets the all the items which keys are equal to the given key
      /// </summary>
      /// <param name="key" type="Object">the key to search</param>
      /// <returns type="Array" elementType="Object">all items with keys equal to the given key</returns>
      return this.getRange(key, key);
    },
    forEach: function(cb) {
      cb = cb || function() {};

      var elements = [],
        node = this.header.nodes[0];

      while (!isNullOrUndefined(node)) {
        cb(node.value);
        node = node.nodes[0];
      }
    },
    print: function() {
      var s='';
      this.forEach(function(value) {
        s += value + '-->';
      });
      console.log(s);
    }
  };
}).call(this);