(function(window) {
  "use strict";

  var combyne = window.combyne;

  // Lazy shortcut.
  NodeList.prototype.__proto__ = Array.prototype;

  function encode(raw) {
    if (typeof raw !== "string") {
      return raw;
    }

    // Identifies all characters in the unicode range: 00A0-9999, ampersands,
    // greater & less than) with their respective html entity.
    return raw.replace(/[\u00A0-\u9999<>\&]/gim, function(match) {
       return "&#" + match.charCodeAt(0) + ";";
    });
  }

  // Pass 
  function combynder(output) {
    var tmpl = this;
    var update = function(key, value) {
      var bound = output.querySelectorAll("[data-bound='" + key + "']");
      
      bound.forEach(function(element) {
        element.innerHTML = encode(value);
      });
    };

    var boundValues = [];
    var data = this.data;

    // Traverse the top level nodes because this is a simple example.
    this.tree.nodes.forEach(function(node) {
      if (node.type === "Property" || node.type === "RawProperty") {
        boundValues.push(node.value);
      }
    });

    // Data binding setup using ES6.
    Object.observe(this.data, function(changes) {
      changes.forEach(function(change) {
        if (boundValues.indexOf(change.name) > -1) {
          if (change.type === "update") {
            update(change.name, data[change.name]);
          }
        }
      });
    });

    // Creates a function that replaces all properties with a wrapper.
    var boundInjector = function(keyName) {
      var original = data[keyName];
      var value = typeof original === "function" ? original() : original;

      return function() {
        return "<span data-bound='" + keyName + "'>" + encode(value) + "</span>";
      };
    };

    // Clone the data object for the initial render, we're going to override
    // the properties.
    var injector = Object.keys(data).reduce(function(clone, keyName) {
      clone[keyName] = boundInjector(keyName);
      return clone;
    }, {});

    // Initial render.
    output.innerHTML = this.render(injector);

    // Bind an event listener for every element that should track changes.
    output.querySelectorAll("[data-bind]").forEach(function(listener) {
      var key = listener.dataset.bind;

      // Should listen to a white listed available events that the elemen.
      listener.addEventListener("keyup", function() {
        data[key] = this.value;
      }, true);
    });

    return this;
  }

  window.combynder = combynder;

  if (combyne) {
    combyne.prototype.bind = combynder;
  }
})(this);
