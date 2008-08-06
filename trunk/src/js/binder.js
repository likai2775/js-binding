// Copyright 2008 Steven Bazyl
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
 //  limitations under the License.

var Binder = {};
Binder.Util = {
  isFunction: function( obj ) {
    return obj != undefined 
            && typeof(obj) == "function"
            && typeof(obj.constructor) == "function"
            && obj.constructor.prototype.hasOwnProperty( "call" );
  },
  isArray: function( obj ) {
    return obj != undefined && ( obj instanceof Array || obj.construtor == "Array" );
  },
  isString: function( obj ) {
    return typeof(obj) == "string" || obj instanceof String;
  },
  isNumber: function( obj ) {
    return typeof(obj) == "number" || obj instanceof Number;
  },
  isBoolean: function( obj ) {
    return typeof(obj) == "boolean" || obj instanceof Boolean;
  },
  isDate: function( obj ) {
    return obj instanceof Date;
  },
  isBasicType: function( obj ) {
    return this.isString( obj ) || this.isNumber( obj ) || this.isBoolean( obj ) || this.isDate( obj );
  },
  isNumeric: function( obj ) {
    return this.isNumber( obj ) ||  ( this.isString(obj) && !isNaN( Number(obj) ) );
  },
  filter: function( array, callback ) {
    var nv = [];
    for( var i = 0; i < array.length; i++ ) {
      if( callback( array[i] ) ) {
        nv.push( array[i] );
      }
    }
    return nv;
  },
  getEventTarget: function( evt ) {
    var e = evt || window.event;
    var target = e.target || e.srcElement;
    if (target.nodeType == 3) { 
      // defeat Safari bug
      target = target.parentNode;
    }
    return target;
  },
  observe: function( element, event, callback ) {
    if( element.addEventListener != undefined ) {
      element.addEventListener( event, callback, false );
    } else {
      element.attachEvent( 'on'+ event, callback );
    }
  }
};

Binder.PropertyAccessor =  function( obj ) {
  this.target = obj || {};
  this.index_regexp = /(.*)\[(.*?)\]/;
};
Binder.PropertyAccessor.prototype = {
  _setProperty: function( obj, path, value, clear ) {
    if( path.length == 0 || obj == undefined) {
      return value;
    }
    var current = path.shift();
    if( current.indexOf( "[" ) >= 0 ) {
      var match = current.match( this.index_regexp );
      var index = match[2];
      current = match[1];
      obj[current] = obj[current] || ( Binder.Util.isNumeric( index ) ? [] : {} );
      if( index ) {
        obj[current][index] = this._setProperty( obj[current][index] || {}, path, value, clear );
      } else {
        if( clear ) {
          obj[current] = Binder.Util.filter( obj[current], function( item) { return item != value; } );
        } else {
          obj[current].push( this._setProperty( {}, path, value, clear ));
        }
      }
    } else {
      obj[current] = this._setProperty( obj[current] || {}, path, value, clear );
    }
    return obj;
  },
  _getProperty: function( obj, path ) {
    if( path.length == 0 || obj == undefined ) {
      return obj;
    }
    var current = path.shift();
    if( current.indexOf( "[" ) >= 0 ) {
      var match = current.match( this.index_regexp );
      current = match[1];
      if( match[2] ) {
        return this._getProperty( obj[current][match[2]], path );
      } else {
        return obj[current];
      }
    } else {
      return this._getProperty( obj[current], path );
    }
  },
  _enumerate: function( collection, obj, path ) {
    if( Binder.Util.isArray( obj ) ) {
      for( var i = 0; i < obj.length; i++ ) {
        _enumerate( collection, obj[i], path + "["+i+"]" );
      }
    } else if( Binder.Util.isBasicType( obj ) ) {
      collection.push( path );
    } else {
      for( property in obj ) {
        if( !Binder.Util.isFunction( property ) ) {
          this._enumerate( collection, obj[property], path == "" ? property : path + "." + property );
        }
      }
    }
  },
  set: function(  property, value ) {
    var path = property.split( "." );
    return this._setProperty( this.target, path, value );
  },
  unset: function(  property, value ) {
    var path = property.split( "." );
    return this._setProperty( this.target, path, value, true );
  },
  get: function(  property ) {
    var path = property.split( "." );
    return this._getProperty( this.target || {}, path );
  },
  properties: function() {
    var props = [];
    this._enumerate( props, this.target, "" );
    return props;
  }
};
Binder.PropertyAccessor.bindTo = function( obj ) {
  return new Binder.PropertyAccessor( obj ); 
}

Binder.TypeRegistry = {
  'string': {
    format: function( value ) {
      return value;
    },
    parse: function( value ) {
      return value && value != "" ? value : undefined;
    }
  },
  'number': {
    format: function( value ) {
      return value;
    },
    parse: function( value ) {
      return Number( value );
    }
  },
  'boolean': {
    format: function( value ) {
      return value;
    },
    parse: function( value ) {
      if( value ) {
        value = value.toLowerCase();
        return "true" == value || "yes" == value;
      }
      return false;
    }
  }  
};

Binder.FormBinder = function( form, accessor ) {
  this.form = form;
  this.accessor = this._getAccessor( accessor );
  this.type_regexp = /type\[(.*)\]/;
  
  if( this.accessor ) {
    var self = this;
    Binder.Util.observe( this.form, 'change', function(e) {
      var src = Binder.Util.getEventTarget( e );
      self.serializeField( src, this.accessor );
    });
  }
};
Binder.FormBinder.prototype = {
  _isSelected: function( value, options ) {
    if( Binder.Util.isArray( options ) ) {
      for( var i = 0; i < options.length; ++i ) {
        if( value == options[i] ) {
          return true;
        }
      }
    } else {
      return value == options;
    }
    return false;
  },
  _getType: function( element ) {
    if( element.className ) {
      var m = element.className.match( this.type_regexp );
      if( m && m[1] ) {
        return m[1];
      }
    }
    return "string";
  },
  _format: function( path, value, element ) {
    var type = this._getType( element );
    var handler = Binder.TypeRegistry[type];
    if( Binder.Util.isArray( value ) && handler ) {
      var nv = [];
      for( var i = 0; i < value.length; i++ ) {
        nv[i] = handler.format( value[i] );
      }
      return nv;
    }
    return handler ? handler.format( value ) : String(value);
  },
  _parse: function( path, value, element ) {
    var type = this._getType( element );
    var handler = Binder.TypeRegistry[type];
    if( Binder.Util.isArray( value ) && handler ) {
      var nv = [];
      for( var i = 0; i < value.length; i++ ) {
        nv[i] = handler.parse( value[i] );
      }
      return nv;
    }
    return handler ? handler.parse( value ) : String(value);
  },
  _getAccessor: function( obj ) {
    if( obj == undefined ) {
      return this.accessor || new Binder.PropertyAccessor( obj );
    } else if( obj instanceof Binder.PropertyAccessor ) {
      return obj;
    } 
    return new Binder.PropertyAccessor( obj );
  },
  serialize: function( obj ) {
    var accessor = this._getAccessor( obj );
    for( var i = 0; i < this.form.elements.length; i++) {
      this.serializeField( this.form.elements[i], accessor );
    }
    return accessor.target;
  },
  serializeField: function( element, obj ) {
    var accessor = this._getAccessor( obj );
    var value = undefined
    if( element.type == "radio" || element.type == "checkbox" )  {
      value = this._parse( element.name, element.value, element );
      if( element.checked ) {
        accessor.set( element.name, value );
      } else {
        accessor.unset( element.name, value );
      }        
    } else if ( element.type == "select-one" || element.type == "select-multiple" ) {
      for( var j = 0; j < element.options.length; j++ ) {
        var v = this._parse( element.name, element.options[j].value, element );
        if( element.options[j].selected ) {
          accessor.unset( element.name, v );
          accessor.set( element.name, v );
        } else {
          accessor.unset( element.name, v );
        }
      }
    } else {
      value = this._parse( element.name, element.value, element );
      accessor.set( element.name, value );
    }
  },
  deserialize: function( obj ) {
    var accessor = this._getAccessor( obj );
    for( var i = 0; i < this.form.elements.length; i++) {
      this.deserializeField( this.form.elements[i], accessor );
    }
    return accessor.target;
  },
  deserializeField: function( element, obj ) {
    var accessor = this._getAccessor( obj );
    var value = accessor.get( element.name );
    value = this._format( element.name, value, element );
    if( element.type == "radio" || element.type == "checkbox" )  {
      element.checked = this._isSelected( element.value, value );
    } else if ( element.type == "select-one" || element.type == "select-multiple" ) {
      for( var j = 0; j < element.options.length; j++ ) {
        element.options[j].selected = this._isSelected( element.options[j].value, value );
      }
    } else {
      element.value = value || "";
    }
  }
};
Binder.FormBinder.bind = function( form, obj ) {
  return new Binder.FormBinder( form, obj );
};
