const app = () => {
  const lines = linesStorage();
//  lines.read().then(console.log);
  
  // cleanup
//  lines.update(null, { foobar: true });
  
  // json data import
//  getLinesJSON()
//  Promise.resolve( testSameTag )
//    .then(lines.importJSON)
//    .then(console.log);
};

const getLinesJSON = () => fetch('data/lines.json' + location.search).then(data => data.json());

const linesStorage = () => {
  const { create, read, update, delere } = crudStorage({ basepath: 'lines' });
  const { importJSON } = linesImporter({ create, update });
  
  return {
    create,
    read,
    update,
    delere,
    importJSON
  };
};

const crudStorage = state => {
  const { basepath } = state;
  const { get, del, put, patch, post } = firebaseStorage({ host: 'https://lines-c8c9f.firebaseio.com/' });
  const path = id => basepath + (id ? `/${id}` : '');
  
  return {
    create: data => post(path(), data),
    read: id => get(path(id)),
    update: (id, data) => id ? patch(path(id), data) : put(path(), data),
    // TODO
    delere: id => Promise.resolve(id),
  };
};

const firebaseStorage = state => {
  const { host } = state;
  
  const postfix = '.json';  
  const url = path => host + path + postfix;
  const toJson = data => data.json();
  const extractId = ({ name: id }) => id;
  
  const request = (path = '', init = {}) => fetch(url(path), init).then(toJson);
  const send = (path = '', data = {}, init = {}) => fetch(url(path), {
    body: JSON.stringify(data),
    headers: {
      'content-type': 'application/json'
    },
    ...init
  }).then(toJson).then(extractId);
  
  return {
    get: (path = '', init = {}) => request(path, init),
    del: (path = '', init = {}) => request(path, { ...init, method: 'DELETE' }),
    // replace node
    put: (path = '', data = {}, init = {}) => send(path, data, { ...init, method: 'PUT' }),
    // update node
    patch: (path = '', data = {}, init = {}) => send(path, data, { ...init, method: 'PATCH' }),
    // creale new list entry with auto-generated timestamp-based key
    post:  (path = '', data = {}, init = {}) => send(path, data, { ...init, method: 'POST' })
  };
};

const linesImporter = state => {
  const { create, update } = state;
  // already added lines map
  const valueToLinePromiseMap = {};
  // 2-way connections map
  const keyToReverseKeyMap = {
    definitions: 'terms',
    examples: 'subjects',
    tags: 'links'
  };
  
  const saveLines = linesData => Promise.all(linesData.map(data => {
    if (valueToLinePromiseMap[data.value]) {
      return valueToLinePromiseMap[data.value];
    }
    
    let linePromise = null;
    
    if (Object.keys(data).length === 1) {
      linePromise = create(data);
    } else {
      let metaPromises = saveMeta(data);
      let metaData = null;
      let lineId = null;
      
      linePromise = Promise.all(metaPromises)
        .then(meta => {
          metaData = meta.reduce((mix, chunk) => ({ ...mix, ...chunk }), {});
          return create({ ...data, ...metaData });
        })
        .then(id => {
          lineId = id;
          metaPromises = updateMeta(lineId, metaData);
          return Promise.all(metaPromises);
        })
        .then(() => lineId);
    }
    
    valueToLinePromiseMap[data.value] = linePromise;
    
    return linePromise;
  }));

  const saveMeta = data => Object.keys(data).map(key => key !== 'value' ? saveLines(data[key]).then(ids => ({
    [key]: ids.reduce((hash, id) => ({ ...hash, [id]: true }), {})
  })) : Promise.resolve());
  
  const updateMeta = (lineId, metaData) => Object.keys(metaData).map(key => Promise.all(
    Object.keys(metaData[key]).map(id => update(id + '/' + keyToReverseKeyMap[key], {
      [lineId]: true
    }))
  ));
  
  return {
    importJSON: saveLines
  }
}


// import test json data

const testNoMeta = [
  {
  	"value": "Oh, give me a break!"
  }
];

const testDef = [
  {
  	"value": "libel",
  	"definitions": [
  		{
  			"value": "lie in written form which caused damage"
  		}
  	]
  }
];

const testDefEx = [
  {
  	"value": "rad",
  	"definitions": [
  		{
  			"value": "excellent; impressive",
  			"examples": [
  				{
  					"value": "his style is so rad"
  				}
  			]
  		}
  		
  	]
  }
];

const testDefMultiEx = [
  {
  	"value": "tackle",
  	"definitions": [
  		{
  			"value": "make determined efforts to deal with (a problem or difficult task)",
  			"examples": [
  				{
  					"value": "Police have launched an initiative to tackle rising crime."
  				},
  				{
  					"value": "If you want to tackle on these tickets then go ahead."
  				}
  			]
  		}
  	]
  }
];

const testMultiDefEx = [
  {
  	"value": "grin",
  	"definitions": [
  		{
  			"value": "A broad smile.",
  			"examples": [
  				{
  					"value": "'OK,' he said with a grin."
  				}
  			]
  		},
  		{
  			"value": "To smile broadly, especially in an unrestrained manner and with the mouth open.",
  			"examples": [
  				{
  					"value": "Dennis appeared, grinning cheerfully."
  				}
  			]
  		}
  	]
  }
];

const testSameTag = [
  {
		"value": "It's very easy to act like a jerk, and then say, \"Well, I'm a jerk, so that's that\", but it's just you making excuses for your excuses.",
		"tags": [
			{
				"value": "Dirk Gently"
			}
		]
	},
	{
		"value": "You get in my way again, I'm taking your head off!",
		"tags": [
			{
				"value": "Dirk Gently"
			}
		]
	}
];

// app launch
app();