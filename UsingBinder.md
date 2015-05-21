# Introduction #

This is a short tutorial on how to use the various classes.

# Creating a Property Accessor #

For this and the remaining examples, let's build up a new object from scratch using **Binder.PropertyAccessor**.

```
var myObject = {};
var accessor = new Binder.PropertyAccessor( myObject );
```

# Setting properties #

You may set any property in the object graph via the **set()** method.  The notation is a simple dotted-path notation, similar to many web frameworks.  It also matches the same path that you would use if accessing the property directly in javascript.  The difference, and the value that PropertyAccessor adds, is that it will transparently create all the objects necessary to reach that path if they don't already exist.  Continuing from the previous example, where we've created an accessor for an empty object, let's set some properties:

```
accessor.set( "username", "jdoe" );
accessor.set( "email", "foo@bar.com" );
accessor.set( "address.street", "123 Market St" );
accessor.set( "address.city", "San Francisco" );
accessor.set( "address.state", "California" );
accessor.set( "phone[0].type", "home" );
accessor.set( "phone[0].number", "555-1212" );
accessor.set( "phone[1].type", "mobile" );
accessor.set( "phone[1].number", "555-7878" );

var result = accessor.target;
```

Our resulting object would then look like:
```
{ 
  username: "jdoe",
  email: "foo@bar.com",
  address: {
    street: "123 Market St",
    city: "San Francisco", 
    state: "California"
  },
  phone: [
    { type: "home", number: "555-1212" },
    { type: "mobile", number: "555-7878" }
  ]
}
```


# Getting properties #

You may also read property values using the same notation using the **get()** method.  Attempts to access invalid paths will not modify the bound object and will simply return **undefined**.

# Addtional notes on Arrays #
In addition to accessing individual array elements, it is also possible to access the array itself by omitting the index.  This provides a little more flexibility. particularly in form binding where we the array size is variable depending on the items selected.  For example:

```
accessor.set( "options[]", "option1" );
accessor.set( "options[]", "option2" );
```
will produce:
```
{
  options: [ "option1", "option2" ] 
}
```

Retrieving the attribute using the same notation returns the array itself.

# Binding to Forms #

While setting and getting properties by themselves isn't too useful, it can be used as the foundation of a simple, declarative form binding mechanism.  Consider:

```
<form>
  <input type="text" name="username"/>
  <input type="text" name="email"/>
  <input type="text" name="address.street"/>
  <input type="text" name="address.city"/>
  <input type="text" name="address.state"/>
  ...
</form>
```

If your form is AJAX based and leverages JSON or DWR, binder makes it trivial to convert this form to the corresponding object graph:

```
{
  username: "...",
  email: "...",
  address: {
    street: "...",
    city: "...",
    state: "..."
  }
}
```

**Binder.FormBinder** does just this and provides two methods, **serialize()** and **deserialize()**.  For example, to fill in a form from a javascript object, use the code:

```
  var myObject = ...;
  var myForm = ...;
  var binder = new Binder.FormBinder( myForm, myObject );
  binder.deserialize();
```

Likewise, to convert the form input back into the object representation:

```
  myObject = binder.serialize();
```

# Type Conversion #

By default, form fields are serialized as strings.  The form binder supports type hints specified in the element's class.  The binder will look for classes in the  form _type[[n](n.md)]_ where _n_ is the identifier of the type handler, and will attempt to parse or format values appropriately.  If no handler for the type is found no conversion is performed.  For example, we can use the built-in number converter in a text field as:

```
  <input type="text" name="age" class="type[number]"/>
```

Built-in handlers include:
  * string - Default handler.  Empty strings are treated as undefined values are are not set as properties.  You may define your own handler if you need to propagate empty strings.
  * number - Basic formatting/parsing of numbers.
  * boolean - Basic formatting/parsing of booleans, true

&lt;-&gt;

"true", false

&lt;-&gt;

"false"

# Custom Type Handlers #

For custom types, you can specify additional handlers by adding properties to Binder.TypeRegistry.  For example, adding a custom date type:

```
  Binder.TypeRegistry['date'] = {
    // Date handler using datejs much improved parsing...
    parse: function( value ) { return Date.parse( value ); },
    format: function( value ) { return Date.toString( 'M/d/yyyy' ); }
  };
  var binder = Binder.FormBinder.bind( myForm, myObject ); 
  binder.deserialize();
```

This handler would be used for any element with a class of _type[[date](date.md)]_.

For additional examples, refer to the unit tests in SVN.