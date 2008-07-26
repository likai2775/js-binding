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

var Binder = function() {
  var ARRAY_MATCH = /(.*)\[(\d*)\]/;
  var _setProperty = function( target, path, value ) {
    if( path.length == 0 ) {
      return value;
    }
	var current = path.shift();
    if( current.indexOf( "[" ) >= 0 ) {
      var match = current.match( ARRAY_MATCH );
      var index = Number(match[2]);
      current = match[1];
      target[current] = target[current] || [];
      target[current][index] = _setProperty( target[current][index] || {}, path, value )
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
      var index = Number(match[2]);
      current = match[1];
      return _getProperty( target[current][index], path )
    } else {
      return _getProperty( target[current], path );
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
	      }
	   };		
	}	
  };
}();
