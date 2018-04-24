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

function LinesStorage(db) {
  const create = data => db.post('lines', data).then(({ name: id }) => id);
  const read = id => db.get('lines' + (id ? `/${id}` : ''));
  const update = () => null;
  const delere = () => null;
  const importJSON = json => Array.isArray(json) ? saveLines(json) : saveLine(json);
   
  // 2-way connections map
  const reverseKeysMap = {
    definitions: 'terms',
    examples: 'subjects',
    tags: 'links'
  };
  
  const saveLines = data => Promise.all( data.map(saveLine) );
  
  const saveLine = data => {
    const keys = Object.keys(data);
    if (keys.length === 1) {
//      console.log('POST');
//      console.log(data);
      return create(data);
    }
    let metaPromises = saveMeta(data);
    let metaData = null;
    let lineId = null;
    return Promise.all(metaPromises)
      .then(meta => {
        metaData = meta.reduce((mix, chunk) => ({ ...mix, ...chunk }), {});
        return create({ ...data, ...metaData });
      })
//      .then(id => {
//        lineId = id;
//        metaPromises = updateMeta(lineId, metaData);
//        return Promise.all(metaPromises);
//      })
//      .then(() => lineId);
  };

  const saveMeta = data => Object.keys(data)
    .map(key => key !== 'value' ? saveLines(data[key]).then(ids => ({
      [key]: ids.reduce((hash, id) => ({ ...hash, [id]: true }), {})
    })) : Promise.resolve());
  
  const updateMeta = (lineId, metaData) => {
    console.log('updateMeta()');
    console.log(lineId);
    console.log(metaData);
    

    return Promise.all(
      Object.keys(metaData)
        .map(key => Object.keys(metaData[key]))
        .map(ids => Promise.all(
          ids.map(id => db.patch('lines/' + id, {
            [reverseKeysMap[key]]: {
              [lineId]: true
            }
          }))
        ))
    );
  };
  
  return {
    create,
    read,
    update,
    delere,
    importJSON
  }
}

const db = new Rest(DB_URL_BASE);
//db.post('lines', {fizz: 'buzz'}).then(() => db.get('lines')).then(console.log);
//db.get('lines').then(console.log);

const lines = new LinesStorage(db);
//lines.read().then(console.log);

// lines db cleanup
//db.put('lines', { foobar: true });

// lines json import to db
const getLinesJSON = () => fetch('data/lines.json' + location.search).then(data => data.json());
getLinesJSON()
  .then(json => json.slice(0, 2))
  .then(lines.importJSON)
  .then(console.log);










