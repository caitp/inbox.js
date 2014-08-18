/**
 * @function
 * @name valueFn
 * @private
 *
 * @description
 * A simple method which takes a single parameter, and returns that parameter. Useful for certain
 * kinds of partial application or currying.
 *
 * @param {*} obj any value of any type. This value will be returned from the method.
 *
 * @returns {*} returns whatever value was passed in.
 */
function valueFn(obj) {
  return obj;
}


/**
 * @function
 * @name noop
 * @private
 *
 * @description
 * A no-operation function, useful for simplifying code by ensuring that a callback is available
 * even if it does nothing useful.
 */
function noop() {}


/**
 * @function
 * @name merge
 * @private
 *
 * @description
 * A simple implementation of the common merge/extend operation. Only accepts two parameters.
 * TODO(@caitp): this should ideally support N parameters.
 *
 * @param {object|Array} dest the destination object to which items are copied.
 * @param {object|Array} src the source object from which items are copied.
 * @param {INModelObject=} resource optional resource class which defines how to merge properties.
 *
 * @returns {object|Array} the destination object.
 */
function merge(dest, src, resource) {
  var key;
  var a;
  var b;
  var mapping;
  for (key in src) {
    if (key !== '_') {
      mapping = resource && mappingForProperty(key, resource);
      if (src.hasOwnProperty(key)) {
        b = src[key];
        if (dest.hasOwnProperty(key)) {
          a = dest[key];
          if (typeof a === 'object' && typeof b === 'object') {
            if (mapping) {
              if (mapping.merge) dest[key] = mapping.merge(a, b);
            } else {
              var start = a ? (isArray(a) ? [] : {}) : null;
              dest[key] = merge(merge(start, a), b, true);
            }
            continue;
          }
          dest[key] = b;
        } else {
          dest[key] = b;
        }
      } else if (mapping) {
        // If there's a mapping for this property, delete it.
        delete dest[key];
      }
    }
  }
  return dest;
}

// Combine oldArray and newArray, by removing items from oldArray (identified by 'id') which are not
// in the newArray --- The arrays are expected to be arrays of Objects.
/**
 * @function
 * @name mergeArray
 * @private
 *
 * @description
 * Simple method for combining two arrays, deleting items from the old array which are not present
 * in the new array. This is optimized for merging arrays of Inbox resource objects
 * ({INModelObject}s) and expects the array to be an array of objects with an ID field.
 *
 * @param {Array} oldArray the original Array, to extend with new items.
 * @param {Array} newArray the new array containing new data from the server.
 * @param {string} id the property name by which objects are identified. This is typically 'id'.
 * @param {function=} newCallback a callback which modifies a new value in some way, typically by
 *   constructing a new INModelObject with it.
 * @param {INModelObject=} resource the constructor for the resource type of which the arrays
 *   should hold. Optional, but useful for ensuring properties are copied with regard for the
 *   resource mapping.
 *
 * @returns {Array} the oldArray.
 */
function mergeArray(oldArray, newArray, id, newCallback, resource) {
  var objects = {};
  var seen = {};
  var numOld = 0;
  var numSeen = 0;
  var numNew = 0;
  var toRemove;
  var callback = typeof newCallback === 'function' && newCallback;
  var i, ii, obj, oldObj;
  var oldLength = oldArray.length;

  for (i = 0, ii = oldLength; i < ii; ++i) {
    obj = oldArray[i];
    if (typeof obj === 'object' && id in obj) {
      ++numOld;
      objects[obj[id]] = obj;
    }
  }

  for (i = 0, ii = newArray.length; i < ii; ++i) {
    obj = newArray[i];

    if (resource && resource.resourceMapping) {
      convertFromRaw(obj, resource);
    }

    if (typeof obj === 'object' && id in obj) {
      ++numNew;
      if ((oldObj = objects[obj[id]])) {
        ++numSeen;
        merge(oldObj, obj, resource);
        seen[obj[id]] = true;
      } else {
        if (callback) obj = callback(obj);
        objects[obj[id]] = obj;
        oldArray.push(obj);
        seen[obj[id]] = true;
      }
    }
  }

  if (numSeen < numOld) {
    // Go through and remove unseen indexes.
    for (i = oldLength; i--;) {
      obj = oldArray[i];
      if (typeof obj === 'object' && id in obj && !seen[obj[id]]) {
        oldArray.splice(i, 1);
      }
    }
  }
  return oldArray;
}


/**
 * @function
 * @name fromArray
 * @private
 *
 * @description
 * Similar to ES6's Array.from, without support for iterators. Ensures that array-like objects are
 * proper Arrays and can be serialized to JSON correctly.
 *
 * @param {*} obj array-like object to be converted to a proper Array.
 *
 * @returns the constructed Array.
 */
function fromArray(obj) {
  if (Array.from) return Array.from(obj);
  if (!obj || !obj.length || typeof obj.length !== 'number' || obj.length !== obj.length) return [];
  var i;
  var ii = obj.length;
  var a = new Array(ii);
  var v;
  for (i = 0; i < ii; ++i) {
    v = obj[i];
    a[i] = v;
  }
  return a;
}


/**
 * @function
 * @name forEach
 * @private
 *
 * @description
 * Similar to AngularJS' forEach method --- this acts as both an ES5 Array#forEach polyfill, as well
 * as a way to iterate over property key/value pairs in plain Objects.
 *
 * @param {object|Array} collection object to iterate over
 * @param {function} fn callback to be invoked for each property
 * @param {object} thisArg the context on which to invoke the callback function.
 */
function forEach(collection, fn, thisArg) {
  var i, ii, key;
  if (typeof thisArg !== 'object' && typeof thisArg !== 'function') {
    thisArg = null;
  }
  if (isArray(collection)) {
    if (collection.forEach) {
      collection.forEach(fn, thisArg);
    } else {
      for (i = 0, ii = collection.length; i < ii; ++i) {
        fn.call(thisArg, collection[i], i, collection);
      }
    }
  } else if (Object.getOwnPropertyNames) {
    var keys = Object.getOwnPropertyNames(collection);
    for (i = 0, ii = keys.length; i < ii; ++i) {
      key = keys[i];
      fn.call(thisArg, collection[key], key, collection);
    }
  } else {
    for (key in collection) {
      if (hasOwnProperty(collection, key)) {
        fn.call(thisArg, collection[key], key, collection);
      }
    }
  }
}


/**
 * @function
 * @name map
 * @private
 *
 * @description
 * Essentially a polyfill for ES5 Array#map --- maps a collection by replacing each resulting
 * value with the result of a callback.
 *
 * @param {Array} collection the collection to be mapped to a new collection
 * @param {function} fn callback function which should return the mapped value.
 * @param {object} thisArg the context on which to invoke the callback function
 *
 * @returns {Array} the mapped array.
 */
function map(collection, fn, thisArg) {
  var i, ii, key, result;
  if (!collection) return;
  if (typeof collection.map === 'function') return collection.map(fn, thisArg);
  if (!isArray(collection)) return;

  if (typeof thisArg !== 'object' && typeof thisArg !== 'function') {
    thisArg = null;
  }

  result = new Array(collection.length);
  for (i = 0, ii = collection.length; i < ii; ++i) {
    result[i] = fn.call(thisArg, collection[i], i, collection);
  }
  return result;
}
