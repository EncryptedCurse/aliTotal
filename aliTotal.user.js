// ==UserScript==
// @name         aliTotal
// @version      1.0
// @author       EncryptedCurse
// @match        *.aliexpress.*/item/*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/EncryptedCurse/aliTotal/master/aliTotal.user.js
// @downloadURL  https://raw.githubusercontent.com/EncryptedCurse/aliTotal/master/aliTotal.user.js
// ==/UserScript==

'use strict';

let currency = '$';
let priceRegex = /(\d+.?\d*)/g;

// update total element text
function updateTotal(text, color = 'black') {
	totalDiv.innerHTML = `<b>Total: <span style="color: ${color}">${text}</b><br><br>`;
}

// check if SKU or shipper country has been selected by user
function selected(list) {
	for (let item of list.querySelectorAll('li')) {
		if (item.classList.contains('selected')) {
			return true;
		}
	}
	return false;
}

// wait for element's existence by XPath or class selector
const checkElement = async (type, selector) => {
	let result;
	type = type.toLowerCase();
	if (type == 'xpath') {
		result = document.evaluate(selector, document, null, XPathResult.ANY_TYPE, null);
	} else if (type == 'class') {
		result = document.getElementsByClassName(selector);
	} else {
		return;
	}
	while (result === null) {
		await new Promise(resolve => requestAnimationFrame(resolve));
	}
	return result;
};

async function onChange(mutations) {
	let countrySelected = countries ? selected(countries) : true;
	let productSelected = selected(products);
	if (!productSelected && !countrySelected) {
		updateTotal('Select an SKU and a country to ship from', '#999');
	} else if (!productSelected) {
		updateTotal('Select an SKU', '#999');
	} else if (!countrySelected) {
		updateTotal('Select a country to ship from', '#999');
	} else {
		let shippingPrice = await checkElement('xpath', '//div[@class="product-shipping-price"]/span[1]').then(result => {
			result = result.iterateNext();
			if (result === null || !priceRegex.test(result.innerText)) {
				return 0;
			} else {
				return parseFloat(result.innerText.match(priceRegex));
			}
		});
		let unitPrice = await checkElement('class', 'product-price-value').then(result => {
			return parseFloat(result[0].innerText.match(priceRegex));
		});
		let totalPrice = ((unitPrice * quantity.value) + shippingPrice).toFixed(2);
		updateTotal(currency + totalPrice, '#ff4747');
	}
}

// obtain total, SKU, and shipper country elements
let quantity = await checkElement('xpath', '//span[@class="next-input next-medium next-input-group-auto-width"]/input[1]').then(result => { return result.iterateNext() });
let countries, products, properties = await checkElement('class', 'sku-property-list').then(result => {
	if (result.length > 1) {
		countries = result[0];
		products = result[1];
	} else {
		products = result[0];
	}
});

// monitor quantity, SKU, and shipper country selections for change
let observer = new MutationObserver(onChange);
let options = {
	subtree: true,
	attributes: true,
	attributeFilter: ['class', 'value'],
};
if (quantity)  observer.observe(quantity,  options);
if (products)  observer.observe(products,  options);
if (countries) observer.observe(countries, options);

// create and insert total element into document
let shippingDiv = await checkElement('class', 'product-shipping').then(result => { return result[0] });
let totalDiv = document.createElement('div');
totalDiv.style.fontSize = '20px';
shippingDiv.appendChild(totalDiv);
onChange();
