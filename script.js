class ColorSchemeType
{
	HairLt_Swap = 0xFF8080;
	Hair_Swap = 0xFF0000;
	HairDk_Swap = 0x800000;
	Body1VL_Swap = 0xFFE0C0;
	Body1Lt_Swap = 0xFFC080;
	Body1_Swap = 0xFF8000;
	Body1Dk_Swap = 0x804000;
	Body1VD_Swap = 0x402000;
	Body1Acc_Swap = 0xFFC000;
	Body2VL_Swap = 0xFFFFC0;
	Body2Lt_Swap = 0xFFFF80;
	Body2_Swap = 0xFFFF00;
	Body2Dk_Swap = 0x808000;
	Body2VD_Swap = 0x404000;
	Body2Acc_Swap = 0xC0FF00;
	SpecialVL_Swap = 0xC0FFC0;
	SpecialLt_Swap = 0x80FF80;
	Special_Swap = 0x00FF00;
	SpecialDk_Swap = 0x008000;
	SpecialVD_Swap = 0x004000;
	SpecialAcc_Swap = 0x00FFC0;
	ClothVL_Swap = 0xC0C0FF;
	ClothLt_Swap = 0x8080FF;
	Cloth_Swap = 0x0000FF;
	ClothDk_Swap = 0x000080;
	WeaponVL_Swap = 0xFFC0FF;
	WeaponLt_Swap = 0xFF80FF;
	Weapon_Swap = 0xFF00FF;
	WeaponDk_Swap = 0x800080;
	WeaponAcc_Swap = 0xFF0080;

	generateXML()
	{
		let xml = '<ColorSchemeType>\n';
		for (let prop in this) if (typeof this[prop] != 'function') xml += '\t<' + prop + '>0x' + this[prop].toString(16).padStart(6, '0').toUpperCase() + '</' + prop + '>\n';
		xml += '</ColorSchemeType>';
		return xml;
	}

	loadXML(xml)
	{
		try
		{
			let parser = new DOMParser();
			let xmlDoc = parser.parseFromString(xml, 'text/xml');
			let xmlNode = xmlDoc.getElementsByTagName('ColorSchemeType')[0];
			if (!xmlNode) throw new Error('ColorSchemeType not found in XML');
			for (let prop in this)
			{
				if (typeof this[prop] != 'function')
				{
					let valueNode = xmlNode.getElementsByTagName(prop)[0];
					if (!valueNode || !valueNode.childNodes[0]) throw new Error(`Missing or invalid value for property ${prop}`);
					let value = valueNode.childNodes[0].nodeValue;
					let result = parseInt(value, 16);
					if (isNaN(result)) throw new Error(`Invalid value for property ${prop}`);
					else this[prop] = result;
				}
			}
		}
		catch (error)
		{
			console.error(`Failed to load XML: ${error.message}`);
			throw error;
		}
	}
}

let colour_scheme = new ColorSchemeType();

var editor = CodeMirror.fromTextArea(document.getElementById("xml-input"),
{
	lineNumbers: true,
	mode: "application/xml",
	htmlMode: true
});

let load_button = document.getElementById('load-button');
let generate_button = document.getElementById('generate-button');
let copy_button = document.getElementById('copy-button');
let error_message = document.getElementById('error-message');

copy_button.addEventListener('click', () => { navigator.clipboard.writeText(editor.getValue()); });

generate_button.addEventListener('click', () =>
{
	editor.setValue(colour_scheme.generateXML());
	error_message.innerHTML = '';
});

load_button.addEventListener('click', () =>
{
	try { colour_scheme.loadXML(editor.getValue()); }
	catch (error)
	{
		error_message.innerHTML = `Error: ${error.message}`;
		return;
	}
	error_message.innerHTML = '';
	editor.setValue(colour_scheme.generateXML());

	let tds = document.getElementsByTagName('td');
	for (let td of tds)
	{
		let colour = colour_scheme[td.className];
		if (colour)
		{
			let input = td.firstChild;
			input.value = '#' + colour.toString(16).padStart(6, '0').toUpperCase();
		}
	}
});

let inputs = document.getElementsByTagName('input');
for (let input of inputs) input.addEventListener('change', () =>
{
	let colorValue = parseInt(input.value.slice(1), 16);
	colour_scheme[input.parentNode.className] = colorValue !== 0 ? colorValue : 0x010101;
});

editor.setValue(colour_scheme.generateXML());
load_button.click();