const DB_URL_BASE = 'https://lines-c8c9f.firebaseio.com/';

function Rest(base) {
  const postfix = '.json';
  
  const href = path => base + path + postfix;
  const request = (path = '', init = {}) => fetch(href(path), init).then(response => response.json());
  const send = (path = '', data = {}, init = {}) => fetch(href(path), {
    body: JSON.stringify(data),
    headers: {
      'content-type': 'application/json'
    },
    ...init
  }).then(response => response.json());
  
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
}

const db = new Rest(DB_URL_BASE);

//db.post('lines', {fizz: 'buzz'}).then(() => db.get('lines')).then(console.log);
//db.get('lines').then(console.log);

const extractLines = chunk => {
  console.log(chunk);
  
  const res = [];
  for (let key in chunk) {
    if (key === 'value') continue;
    res.push(chunk[key]);
  }
  return res;
};

const getLinesData = () => fetch('data/lines.json' + location.search).then(response => response.json());

const saveLine = data => {
  const keys = Object.keys(data);
  if (keys.length === 1) {
    console.log('POST');
    console.log(data);
    return db.post('lines', data);
  }
  const chunkPromises = [];
  for (let i = 0, key = keys[i]; i < keys.length; ++i, key = keys[i]) {
    if (key === 'value') continue;
    chunkPromises.push(saveLines(data[key]).then(ids => ({
      [key]: ids.reduce((hash, id) => ({ ...hash, [id.name]: true }), {})
    })));
  }
  return Promise.all(chunkPromises)
    .then(chunks => db.post('lines', chunks.reduce((mix, chunk) => ({ ...mix, ...chunk }), data)));
};

const saveLines = data => Promise.all(data.map(chunk => saveLine(chunk)));

//getLinesData()
////  .then(data => data.slice(0, 2))
//  .then(saveLines)
//  .then(console.log);
















