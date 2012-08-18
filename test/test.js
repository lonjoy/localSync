var mocha = require('mocha');
var should = require('should');


var _ = require('../underscore-min');
var async = require('../async.min');
var LocalStore = require('../LocalStore').LocalStore;
var localStorage = require('./localStorage');

function arrayShuffle(theArray) {
  var len = theArray.length;
  var i = len;
   while (i--) {
    var p = parseInt(Math.random()*len);
    var t = theArray[i];
      theArray[i] = theArray[p];
      theArray[p] = t;
  }

  return theArray;
};

function generateItems(count) {
  var items = [];

  for(var i=1; i<=count; i++) {
    items.push( { id: i.toString(),  timestamp: i} );
  }

  return items;
};

describe('create a time indexed store', function(){
  var timeStore;
  describe('Create the store', function(){
    it('should contain one index', function(done) {
      timeStore = new LocalStore('timeStore', 'id',  localStorage);
      timeStore.addIndex('time', 'timestamp');
      timeStore.indexCollection.should.have.property('time');
      done();
    });

    it('should have 1000 items ordered by date', function(done) {
      var items = arrayShuffle(generateItems(1000));

      items.forEach(function(item) { timeStore.addOrUpdate(item); });
      var i=1;
      timeStore.forEachByIndex('time', function(value) {
        value.id.should.equal(i.toString());
        i++;
      });
      done();
    });
    it('should remove 300 items and preserve order', function(done) {
      var items = arrayShuffle(generateItems(1000));
      var itemsToRemove = items.splice(0,300);

      itemsToRemove.forEach(function(item) { timeStore.removeByKey(item.id);});
      var count = 0;
      timeStore.forEach(function() { count++ ;});
      count.should.equal(700);

      items.sort(function(a,b) {
        if (a.timestamp < b.timestamp) return -1;
        if (a.timestamp === b.timestamp) return a.id - b.id;
        return 1;
      });
      
      timeStore.indexCollection.should.have.property('time');
      timeStore.forEachByIndex('time', function(value) {
        value.id.should.equal(items[0].id);
        items.shift();
      });
      done();
    });
    it('should clear store', function(done) {
      timeStore.clear();
      var count = 0;
      timeStore.forEach(function() { count++ ;});
      count.should.equal(0);
      done();
    });
    it('should add 100 items', function(done) {
      var items = arrayShuffle(generateItems(100));

      items.forEach(function(item) { timeStore.addOrUpdate(item); });
      var count = 0;
      timeStore.forEach(function() { count++ ;});
      count.should.equal(100);
      var i=1;
      timeStore.forEachByIndex('time', function(value) {
        value.id.should.equal(i.toString());
        i++;
      });
      done();
    });
    it('should update 50 items', function(done) {
      var items = generateItems(50);

      items.forEach(function(item) { if (item.timestamp % 2 == 0) item.timestamp++; });

      timeStore.sync(items, 'id', 
        function isUpdated(a,b) {
          return (b.timestamp > a.timestamp) ;
        },
        function shouldDelete(item) {
          return true;
        },
        function(state) {
          _.size(state.updated).should.equal(25);
          items.sort(function(a,b) {
            if (a.timestamp < b.timestamp) return -1;
            if (a.timestamp === b.timestamp) return a.id - b.id;
            return 1;
          });
          timeStore.forEachByIndex('time', function(value) {
            if (items.length > 0) {
              value.id.should.equal(items[0].id);
              items.shift();
            }
          });
          done();
        });
    });
  });
});