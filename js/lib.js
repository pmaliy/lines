const firebaseStorage = (() => {
  let host = '';
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
  
  return state => {
    ({ host } = state);

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
})();

const crudStorage = (({ firebaseStorage }) => {
  const { get, del, put, patch, post } = firebaseStorage({ host: 'https://lines-c8c9f.firebaseio.com/' });
  let basepath = '';
  const path = id => basepath + (id ? `/${id}` : '');
  
  return state => {
    ({ basepath } = state);
    
    return {
      create: data => post(path(), data),
      read: id => get(path(id)),
      update: (id, data) => id ? patch(path(id), data) : put(path(), data),
      // TODO
      delere: id => Promise.resolve(id),
    };
  }
})({ firebaseStorage });

const linesImporter = (() => {
  // already added lines map
  const valueToLinePromiseMap = {};
  // 2-way connections map
  const keyToReverseKeyMap = {
    definitions: 'terms',
    examples: 'subjects',
    tags: 'links'
  };
  
  let create, read, update;
  
  const importJSON = linesData => {
    return read()
      .then(hash => Object.keys(hash).forEach(id => valueToLinePromiseMap[hash[id].value] = Promise.resolve(id)))
      .then(() => saveLines(linesData));
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
  
  return state => {
    ({ create, read, update } = state);
    
    return { importJSON };
  }
})();

const linesStorage = (({ crudStorage, linesImporter }) => {
  const basepath = 'lines';
  const { create, read, update, delere } = crudStorage({ basepath });
  const { importJSON } = linesImporter({ create, read, update });
  
  return () => ({
    create,
    read,
    update,
    delere,
    importJSON
  });
})({ crudStorage, linesImporter });