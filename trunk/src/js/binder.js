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

Binder.PropertyAccessor = function() {
  var ARRAY_MATCH = /(.*)\[(\d*)\]/;
  var _setProperty = function( target, path, value ) {
    if( path.length == 0 ) {
      return value;
    }
	var current = path.shift();
    if( current.indexOf( "[" ) >= 0 ) {
      var match = current.match( ARRAY_MATCH );
      current = match[1];
      target[current] = target[current] || [];
      if( match[2] ) {
        var index = Number(match[2]);
        target[current][index] = _setProperty( target[current][index] || {}, path, value )	
      } else {
        target[current].push( _setProperty( {}, path, value ))	    
      }
      return target;
    } else {
      target[current] = _setProperty( target[current] || {}, path, value );
      return target;
    }
  };
  var _getProperty = function( target, path ) {
    if( path.length == 0 || target == undefined ) {
      return target;
    }
    var current = path.shift();
    if( current.indexOf( "[" ) >= 0 ) {
      var match = current.match( ARRAY_MATCH );
      current = match[1];
      if( match[2] ) {
        var index = Number(match[2]);
        return _getProperty( target[current][index], path )	 
      } else {
	    return target[current];
      }
    } else {
      return _getProperty( target[current], path );
    }
  };
  var _enumerate = function( collection, target, path ) {
    if( target instanceof Array ) {
	  for( var i = 0; i < target.length; i++ ) {
	    _enumerate( collection, target[i], path + "["+i+"]" );	
      }
    } else if( typeof(target) == "string" || typeof(target) == "number" || typeof(target) == "date"  || typeof(target) == "boolean" ) {
	  collection.push( path );
    } else {
	  for( property in target ) {
		if( typeof( property ) != "function" ) {
		    _enumerate( collection, target[property], path == "" ? property : path + "." + property );				
		}
      }	
    }
  };
  return {
	bindTo: function( obj ) {
      return {
	      target: obj || {},
    	  set: function(  property, value ) {
    	      var path = property.split( "." );
	          return _setProperty( this.target, path, value );
	      },
	      get: function(  property ) {
	        var path = property.split( "." );	     
	        return _getProperty( this.target || {}, path );	
	      },
          properties: function() {
             var props = [];
             _enumerate( props, this.target, "" );
             return props;
          }
	   };		
	}
  };
}();


Binder.FormBinder = function() {
  var TYPE_MATCH = /type\[(.*)\]/;
  var NUMBER_HANDLER = {
    format: function( value ) {
      return String( value );	
    },
    parse: function( value ) {
      return Number( value );	
    }
  };
  var _isSelected = function( value, options ) {
    if( options instanceof Array ) {
	  for( var i = 0; i < options.length; ++i ) {
	    if( value == options[i] ) {
		  return true;
		}	 
	  }
    } else {
	  return value == options;
    }
    return false;
  };
  var _getType = function( element ) {
    if( element.className ) {
 	  var m = element.className.match( TYPE_MATCH );
      if( m && m[1] ) {
        return m[1];
	  }
	}
	return "string";
  };
  var _format = function( path, value, element ) {
    var type = _getType( element );
    var handler = this.typeHandlers[type];
    return handler ? handler.format( value ) : value;	
  };
  var _parse = function( path, value, element ) {
    var type = _getType( element );
    var handler = this.typeHandlers[type];
    return handler ? handler.parse( value ) : value;	
  };
  return {
	bind: function( form, handlers ) {
      var self = this;
	  this.typeHandlers = {
	    number: NUMBER_HANDLER
	  };
	  for( prop in handlers ) {
	    this.typeHandlers[prop] = handlers[prop];	 
	  };
	  return {
		serialize: function( obj ) {
	      var accessor = Binder.PropertyAccessor.bindTo( obj );
	      for( var i = 0; i < form.elements.length; i++) {
	        var element = form.elements[i];
	        var value = undefined
	        if( element.type == "radio" || element.type == "checkbox" )  {
	          if( element.checked ) {
	            value = _parse.apply( self, [ element.name, element.value, element ] );	
	          }
	        } else if ( element.type == "select-one" || element.type == "select-multiple" ) {
	          for( var j = 0; j < element.options.length; j++ ) {
	            if( element.options[j].selected ) {
		          var v = _parse.apply( self, [ element.name, element.options[j].value, element ] );
	              accessor.set( element.name, v );
	            }  
	          }
	        } else {
		      value = _parse.apply( self, [ element.name, element.value, element ] );
	      	}
	        if( value ) {
	          accessor.set( element.name, value );	
	        }
	      }
	      return accessor.target;
		},
		deserialize: function( obj ) {
	      var accessor = Binder.PropertyAccessor.bindTo( obj );
	      for( var i = 0; i < form.elements.length; i++) {
	        var element = form.elements[i];
	        var value = accessor.get( element.name );
	        if( element.type == "radio" || element.type == "checkbox" )  {
	          element.checked = _isSelected( element.value, value );
	        } else if ( element.type == "select-one" || element.type == "select-multiple" ) {
	          for( var j = 0; j < element.options.length; j++ ) {
		        element.options[j].selected = _isSelected( element.options[j].value, value );
	          }
	        } else {
		      value = _format.apply( self, [ element.name, value, element ] );
		      element.value = value || "";
	      	}
	      }
	      return accessor.target;
		}
	  };
	}
  };
}();
