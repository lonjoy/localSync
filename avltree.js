// Source: https://github.com/dhruvbird/algorithm-js
// Author: Dhruv Matani
// License: MIT

// An AVL Tree Node
(function() {
  "use strict";
  
  // Establish the root object, `window` in the browser, or `global` on the server.
  var root = this;

  function AVLTreeNode(value, parent, height, weight, left, right, metadata) {
    this.value = value;
    this.parent = parent;
    this.height = height;
    this.weight = weight;
    this.left = left;
    this.right = right;
    this.metadata = metadata;
  }

  //
  // An AVL tree is a Height Balanced Binary Search Tree
  // 
  // insert: O(log n)
  // remove: O(log g)
  // find:   O(log g)
  // min:    O(log g)
  // max:    O(log g)
  // successor: O(log n), amortized O(1)
  // predecessor: O(log n), amortized O(1)
  // lower_bound: O(log n)
  // upper_bound: O(log n)
  // find_by_rank: O(log n)
  // clear:  O(1)
  // length: O(1)
  // height: O(1)
  // forEach: O(n) (performs an in-order traversal)
  // toGraphviz: O(n) Returns a string that can be fed to Graphviz to 
  //                  draw a Tree
  //
  // References:
  // http://en.wikipedia.org/wiki/AVL_tree
  // http://en.wikipedia.org/wiki/Tree_rotation
  // http://closure-library.googlecode.com/svn/docs/closure_goog_structs_avltree.js.source.html
  // http://gcc.gnu.org/viewcvs/trunk/libstdc%2B%2B-v3/include/bits/stl_tree.h?revision=169899&view=markup
  //

  //
  // Comparators:
  // Generate GT(>) from LT(<)
  //
  function cmp_lt(lhs, rhs) {
    return lhs < rhs;
  }

  function cmp_gt_gen(cmp_lt) {
    return function(lhs, rhs) {
      return cmp_lt(rhs, lhs);
    };
  }

  function cmp_eq_gen(cmp_lt) {
    return function(lhs, rhs) {
      return !cmp_lt(lhs, rhs) && !cmp_lt(rhs, lhs);
    };
  }

  function cmp_lt_eq_gen(cmp_lt) {
    var cmp_eq = cmp_eq_gen(cmp_lt);
    return function(lhs, rhs) {
      return cmp_lt(lhs, rhs) || cmp_eq(rhs, lhs);
    };
  }

  function cmp_gt_eq_gen(cmp_lt) {
    return function(lhs, rhs) {
      return !cmp_lt(lhs, rhs);
    };
  }


  var cmp_gt    = cmp_gt_gen(cmp_lt);
  var cmp_eq    = cmp_eq_gen(cmp_lt);
  var cmp_lt_eq = cmp_lt_eq_gen(cmp_lt);
  var cmp_gt_eq = cmp_gt_eq_gen(cmp_lt);

  function AVLTree(_cmp_lt) {
    this.cmp_lt = _cmp_lt || cmp_lt;
    this.cmp_eq = cmp_eq_gen(this.cmp_lt);
    this.hooks = [];
    this._gw_ctr = 1;

    for (var i = 1; i < arguments.length; ++i) {
      this.hooks.push(arguments[i]);
    }
    this.root = null;
  }

  // Export AVLTree for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `AVLTree` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports
    }
    exports.AVLTree = AVLTree;
  } else {
    root['AVLTree'] = AVLTree;
  }

  AVLTree.prototype = {
    insert: function(value, metadata) {
      if (!this.root) {
        this.root = new AVLTreeNode(value, null, 0, 1, null, null, metadata);
      } 
      else {
        var node = this.root;
        var prev = null;

        while (node) {
          prev = node;
          if (this.cmp_lt(value, node.value)) {
            node = node.left;
          } else {
            node = node.right;
          }
        }

        var nn = new AVLTreeNode(value, prev, 0, 1, null, null, metadata);
        if (this.cmp_lt(value, prev.value)) {
          // value < nodes.prev.value
          prev.left = nn;
        } 
        else {
          // value > nodes.prev.value
          prev.right = nn;
        }

        this._rebalance_to_root(nn);
      }
    },

    remove: function(value, predicate) {
      var node = this._find_node(value);
      if (!node) {
        return false;
      }

      predicate = predicate || function() { return true; };

      while(node && this.cmp_eq(node.value, value) && !predicate(node)) {
        node = this.successor(node);
      }

      if (node && predicate(node)) {
        this._remove(node);
        return true;
      }

      return false;
    },

    find: function(value) {
      var node = this._find_node(value);
      return node;
    },

    lower_bound: function(value) {
      var node = this.root;
      var ret = null;

      while (node) {
        if (!this.cmp_lt(node.value, value)) {
          // this.root.value >= value
          ret = node;
          node = node.left;
        } else {
          node = node.right;
        }
      }
      return ret;
    },

    upper_bound: function(value) {
      var node = this.root;
      var ret = null;

      while (node) {
        if (this.cmp_lt(value, node.value)) {
          // value < this.root.value
          ret = node;
          node = node.left;
        } else {
          node = node.right;
        }
      }
      return ret;
    },

    find_by_rank: function(rank) {
      return this._find_by_rank(this.root, rank);
    },

    clear: function() {
      this.root = null;
    },

    items: function() {
      var _i = [];
      this.forEach(function(value) {
        _i.push(value);
      });
      return _i;
    },

    toGraphviz: function() {
      // Returns a grpahviz consumable tree for plotting
      var graph = ['fontname=arial', 'node [fontname=arial,fontsize=10]', 'digraph {'];
      var nodes = [];
      var edges = [];

      this.forEach((function(value, node) {
        if (node.parent && !node.parent.id) {
          node.parent.id = this._gw_ctr++;
        }
        if (!node.id) {
          node.id = this._gw_ctr++;
        }
        if (node.parent) {
          edges.push('"' + node.parent.value + '-' + node.parent.id + '"->"' + node.value + '-' + node.id + '"');
        }
        nodes.push('"' + node.value + '-' + node.id + '"');
      }).bind(this));

      if (edges.length > 0) {
        edges.push('');
      }

      graph.push(nodes.join(', '), '}');
      graph.push(edges.join('; '), '');
      return graph.join('\n');
    },

    forEach: function(proc) {
      this._forEach(this.root, proc);
    },

    _forEach: function(node, proc) {
      if (node) {
        this._forEach(node.left, proc);
        proc(node.value, node);
        this._forEach(node.right, proc);
      }
    },

    _find_by_rank: function(node, rank) {
      if (rank > node.weight) {
        return null;
      }

      var lw = this._has_left_child(node) ? node.left.weight : 0;
      var rw = this._has_right_child(node) ? node.right.weight : 0;

      if (rank <= lw) {
        return this._find_by_rank(node.left, rank);
      } else if (rank > lw + 1) {
        return this._find_by_rank(node.right, rank - lw - 1);
      } else {
        // Must be the root
        return node.value;
      }
    },

    _remove: function(node) {
      // console.log("_remove::node:", node);
      var is_leaf = this._is_leaf(node);
      var has_one_child = this._has_one_child(node);

      // console.log("is_leaf, has_one_child:", is_leaf, has_one_child);
      if (is_leaf || has_one_child) {
        if (is_leaf) {
          // console.log("Node:", node, "is a leaf");
          if (this._is_root(node)) {
            this.root = null;
          } else {
            if (this._is_left_child(node)) {
              // console.log("Setting left child of:", node.parent, "to null");
              node.parent.left = null;
            } else {
              node.parent.right = null;
            }
            this._rebalance_to_root(node.parent);
          }
        } else {
          // Only 1 child
          var tgt_node = null;
          if (this._has_left_child(node)) {
            tgt_node = node.left;
          } else {
            tgt_node = node.right;
          }

          if (this._is_root(node)) {
            this.root = tgt_node;
            // No need to re-balance since this case can occur only 
            // if the tree has just 2 nodes
          } else {
            if (this._is_left_child(node)) {
              node.parent.left = tgt_node;
            } else {
              node.parent.right = tgt_node;
            }
          }
          if (tgt_node) {
            tgt_node.parent = node.parent;
          }
          this._rebalance_to_root(node.parent);
        }
      } else {
        // Has 2 children. Find the successor of this node, 
        // delete that node and replace the value of this 
        // node with that node's value
        var replacement = this.successor(node);
        // console.log("replacement:", replacement);
        this._remove(replacement);
        node.value = replacement.value;
      }
    },

    successor: function(node) {
      if (node.right) {
        node = node.right;
        while (node && node.left) {
          node = node.left;
        }
        return node;
      } else {
        while (node.parent && this._is_right_child(node)) {
          node = node.parent;
        }
        // node is node.parent's left child or null (if node is the root)
        node = node.parent;
        return node;
      }
    },

    predecessor: function(node) {
      if (node.left) {
        node = node.left;
        while (node && node.right) {
          node = node.right;
        }
        return node;
      } else {
        while (node.parent && this._is_left_child(node)) {
          node = node.parent;
        }
        // node is node.parent's right child or null (if node is the root)
        node = node.parent;
        return node;
      }
    },

    _is_leaf: function(node) {
      return !node.left && !node.right;
    },

    _has_one_child: function(node) {
      return this._has_left_child(node) + this._has_right_child(node) == 1;
    },

    _has_left_child: function(node) {
      return !!node.left;
    },

    _has_right_child: function(node) {
      return !!node.right;
    },

    _update_metadata: function(node) {
      if (!node) {
        return;
      }

      var height = Math.max(
      (node.left ? node.left.height : 0), (node.right ? node.right.height : 0)) + 1;

      var weight = (node.left ? node.left.weight : 0) + (node.right ? node.right.weight : 0) + 1;

      // console.log("\nvalue, height, weight:", node.value, height, weight);
      node.height = height;
      node.weight = weight;

      // Provide a set of "hook" methods to the user so that the user may
      // add custom fields to the AVLTreeNode. Useful for doing stuff like:
      // sum, min, max in O(1)
      this.hooks.forEach(function(hook) {
        hook(node);
      });

    },

    _update_metadata_upto_root: function(node) {
      while (node) {
        this._update_metadata(node);
        node = node.parent;
      }
    },

    _is_root: function(node) {
      return !node.parent;
    },

    _is_left_child: function(node) {
      if (!node) {
        return false;
      }
      return node.parent.left === node;
    },

    _is_right_child: function(node) {
      if (!node) {
        return false;
      }
      return node.parent.right === node;
    },

    _find_node: function(value) {
      var node = this.lower_bound(value);
      if (node && this.cmp_eq(node.value, value)) {
        return node;
      } else {
        return null;
      }
    },

    _rotate_left: function(node) {
      if (!node) {
        return;
      }
      var tmp = node.right;

      if (this._is_root(node)) {
        this.root = node.right;
        this.root.parent = null;
      } else if (this._is_left_child(node)) {
        node.parent.left = node.right;
        node.right.parent = node.parent;
      } else {
        // Must be a right child
        node.parent.right = node.right;
        node.right.parent = node.parent;
      }

      node.right = tmp.left;
      if (tmp.left) {
        tmp.left.parent = node;
      }
      tmp.left = node;
      node.parent = tmp;

      this._update_metadata(node);
      this._update_metadata(tmp);
    },

    _rotate_right: function(node) {
      if (!node) {
        return;
      }
      var tmp = node.left;

      if (this._is_root(node)) {
        this.root = tmp;
        this.root.parent = null;
      } else if (this._is_left_child(node)) {
        node.parent.left = tmp;
        tmp.parent = node.parent;
      } else {
        // Must be a right child
        node.parent.right = tmp;
        tmp.parent = node.parent;
      }

      node.left = tmp.right;
      if (tmp.right) {
        tmp.right.parent = node;
      }
      tmp.right = node;
      node.parent = tmp;

      this._update_metadata(node);
      this._update_metadata(tmp);
    },

    _balance_factor: function(node) {
      if (!node) {
        return 0;
      }

      var lh = node.left ? node.left.height : 0;
      var rh = node.right ? node.right.height : 0;

      // console.log("_balance_factor::of:", node.value, "is:", lh-rh);
      return lh - rh;
    },

    _rebalance_to_root: function(node) {
      while (node) {
        this._rebalance(node);
        node = node.parent;
      }
    },

    _rebalance: function(node) {
      this._update_metadata(node);
      var bf = this._balance_factor(node);
      var _bf;

      if (bf > 1) {
        // Do a right rotation since the left subtree is > the right subtree
        _bf = this._balance_factor(node.left);
        if (_bf < 0) {
          this._rotate_left(node.left);
        }
        this._update_metadata(node.left);
        this._rotate_right(node);
      } else if (bf < -1) {
        // Do a left rotation since the right subtree is > the left subtree
        _bf = this._balance_factor(node.right);
        if (_bf > 0) {
          this._rotate_right(node.right);
        }
        this._update_metadata(node.right);
        this._rotate_left(node);
      }

      // update metadata for 'node'
      this._update_metadata(node);
    }
  };

  AVLTree.prototype.getHeight = function() {
    return this.root ? this.root.height : 0;
  };

  AVLTree.prototype.getLength = function() {
    return this.root ? this.root.weight : 0;
  };

  AVLTree.prototype.getMin = function() {
    return this.length ? this.find_by_rank(1) : null;
  };

  AVLTree.prototype.getMax = function() {
    return this.length ? this.find_by_rank(this.length) : null;
  };

  if (Object.prototype.__defineGetter__) {
    AVLTree.prototype.__defineGetter__('height', function() {
      return this.getHeight();
    });

    AVLTree.prototype.__defineGetter__('length', function() {
      return this.getLength();
    });

    AVLTree.prototype.__defineGetter__('min', function() {
      return this.getMin();
    });

    AVLTree.prototype.__defineGetter__('max', function() {
      return this.getMax();
    });
  }

}).call(this);
