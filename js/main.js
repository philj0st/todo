/**
*	Item constructor
*	@param	{number}	id
*	@param	{string}	text
*	@param	{bool}		status - true representing an active task, false a completed one
*/
function Item (id, text, status) {
	this.id = id;
	this.text = text;
	this.status = status;
	//will be assigned on ItemList.addItem()
	this.parentList = {};
	//will be assigned on Item.toElement()
	this.elementRef = {};
}

Item.prototype.complete = function() {
	this.status = false;
	//ItemList.items observer only notices changes to the array and not to it's objects
	//so we either have to observe every object or call createDOM() manually
	this.parentList.createDOM();
	this.parentList.saveItemsToLocalStorage();
};

/**
*	@return	{element}	returns an Element
*/
Item.prototype.toElement = function() {

	//create <li itemId="42" class="active list-group-item"></li>
	var element = document.createElement('li');
	if (this.status) {
		element.classList.add("pending");
	}else{
		element.classList.add("done");
	};
	element.classList.add("list-group-item");

	//create and append the textNode and the checkbox to the <label>
	var label = document.createElement('label');
	var textNode = document.createTextNode(this.text);
	var checkbox = document.createElement('input');
	var span = document.createElement('span');
	checkbox.type = 'checkbox';
	span.appendChild(textNode);
	label.appendChild(checkbox);
	label.appendChild(span);
	element.appendChild(label);
	//create a reference
	this.elementRef = element;
	checkbox.addEventListener('change', function (event) {
		event.stopPropagation();
		if (checkbox.checked) {
			this.parentList.addSelected(this);
		}else{
			this.parentList.removeSelected(this);
		}
	}.bind(this))
	return element;
};

/**
*	ItemList constructor
*	@param	{element}	elementRef
*/
function ItemList (elementRef) {
	this.elementRef = elementRef;
	this.items = [];
	//Items will be pushed here on checkbox selection
	this.selected = [];

	//create somewhat of an experimental data binding.
	//Attention! 'this' would be referring to the window object instead of the instance of ItemList, that's why we use bind(this) here to pass context
	Array.observe(this.items, function (event) {
		//recreate the whole DOM on changes to the items Array
		this.createDOM();
		this.saveItemsToLocalStorage();
	}.bind(this))

	Array.observe(this.selected, function (event) {
		var btnRemoveItem = document.getElementById('btnRemoveItems');
		var btnCompleteSelected = document.getElementById('btnCompleteSelected');
		if (this.selected.length) {
			enableBtn(btnRemoveItem);
			enableBtn(btnCompleteSelected);
		}else{
			disableBtn(btnRemoveItem);
			disableBtn(btnCompleteSelected);
		}
	}.bind(this))
};

ItemList.prototype.saveItemsToLocalStorage = function(event) {
	//save JSONstringified ItemList.items to localStorage
	//can't JSON.stringify Item.parentList because of circular structure
	//JSON.stringify(value[, replacer[, space]]) replacer -> "array of String and Number objects that serve as a whitelist for selecting the properties of the value object to be included in the JSON string"
	//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
	var uncircularItems = [];
	this.items.forEach(function(item){
		uncircularItems.push(JSON.stringify(item,["id","status","text"]))
	});
	//IMPROVE: relate stored data to ItemList instance (id)?
	window.localStorage.setItem('items', uncircularItems);
	console.log("localStorage updated");
};

//IMPROVE: update only parts of the DOM depending on data changes
ItemList.prototype.createDOM = function() {
	this.clearDOM();
	for (var i = 0; i < this.items.length; i++) {
		var listItem = this.items[i].toElement();
		//append the freshly created DOM node to the element reference saved in the Class
		this.elementRef.appendChild(listItem);
	}
	console.log("DOM created");
};

/**
*	creates a new <li> in the gui and saves it's data on blur
*/
ItemList.prototype.promptNewItem = function() {
	var item = new Item(42,"",true).toElement();
	var span = item.childNodes[0].childNodes[1];
	span.setAttribute('contenteditable','true');
	span.addEventListener('blur', function (event) {
		this.addItem(new Item(42,event.target.innerHTML, true));
	}.bind(this))

	//prevent linebreaking in contenteditable span
	span.addEventListener('keypress', function (event) {
		if (event.keyCode === 13) {
			event.preventDefault();
			event.target.blur();
		};
	})
	this.elementRef.appendChild(item);

	//TODO: focus the created element
	//http://stackoverflow.com/questions/13513329/set-cursor-to-the-end-of-contenteditable-div
};

/**
*	Clears the list
*	avoid using innerHTML="" see jsperf http://jsperf.com/innerhtml-vs-removechild/37
*	thanks https://coderwall.com/p/nygghw/don-t-use-innerhtml-to-empty-dom-elements
*/
ItemList.prototype.clearDOM = function() {
	while(this.elementRef.firstChild){
		this.elementRef.removeChild(this.elementRef.firstChild);
	}
};

/**
*	Adds an item
*	@param	{Item}	item
*/
ItemList.prototype.addItem = function(item) {
	//create reference to the list
	item.parentList = this;
	return this.items.push(item);
};

/**
*	removes an Item from an ItemList
*	@param	{Item}	item
*/
ItemList.prototype.removeItem = function(item) {
	return this.items.splice(this.items.indexOf(item),1);
};

ItemList.prototype.addSelected = function(item) {
	console.log("selection added");
	return this.selected.push(item);
};

ItemList.prototype.removeSelected = function(item) {
	console.log("selection removed");
	return this.selected.splice(this.selected.indexOf(item),1);
};
/**
*	@param	{[item]}	items - Array of Items
*/
ItemList.prototype.removeSelectedItems = function() {
	/*
	for (var i = this.selected.length - 1; i >= 0; i--) {
		this.removeItem(this.selected[i]);
	};*/
	while(this.selected.length){
		this.removeItem(this.selected.pop());
	}
};

ItemList.prototype.completeSelected = function() {
	for (var i = this.selected.length - 1; i >= 0; i--) {
		//search every Item in .selected in .items and invoke Item.complete() on them;
		this.items[this.items.indexOf(this.selected[i])].complete();
	};
};

function ready(fn) {
  if (document.readyState != 'loading'){
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn);
  }
}

//gui functions
function enableBtn (btnElement) {
	btnElement.classList.remove("disabled");
}

function disableBtn (btnElement) {
	btnElement.classList.add("disabled");
}

/**
*	init - register eventhandler
*/
ready(function () {
	var mainList = new ItemList(document.getElementById('list'));
	
	var storedData = [{"id":1,"text":"save teh worldz!","status":true},{"id":2,"text":"hijack some sessionz","status":true},{"id":3,"text":"create a todo-app","status":false}];
	//override the mockup data if there is any stored
	if(localStorage.items){
		//TODO: manually adding [] ? there's got to be a better solution
		storedData = JSON.parse("["+localStorage.items+"]");
		console.log("took localStorage data");
	}
	for (var i = 0; i < storedData.length; i++) {
		mainList.addItem(new Item(storedData[i].id, storedData[i].text, storedData[i].status));
	};

	mainList.createDOM();

	//register eventhandler
	var btnAddItem = document.getElementById('btnAddItem');
	var btnRemoveItem = document.getElementById('btnRemoveItems');
	var btnCompletedItem = document.getElementById('btnCompleteSelected');

	btnAddItem.addEventListener('click', mainList.promptNewItem.bind(mainList));

	//TODO: find a way to dynamically bind list .. relate buttons to list?
	btnRemoveItem.addEventListener('click', mainList.removeSelectedItems.bind(mainList));
	btnCompleteSelected.addEventListener('click', mainList.completeSelected.bind(mainList));

	//DEBUG: pass reference outside of scope to be accessible via console
	mainListRef = mainList;
});

//DEBUG:
var mainListRef = {};