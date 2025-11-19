
export class EntitySheetHelper {
  

  static async createDialog(data={}, options={}) {

    // Collect data
    const documentName = this.metadata.name;
    const folders = game.folders.filter(f => (f.type === documentName) && f.displayed);
    const label = game.i18n.localize(this.metadata.label);
    const title = game.i18n.format("DOCUMENT.Create", {type: label});

    // Identify the template Actor types
    const collection = game.collections.get(this.documentName);
    const templates = collection.filter(a => a.getFlag("break", "isTemplate"));
    const defaultType = this.TYPES.filter(t => t !== CONST.BASE_DOCUMENT_TYPE)[0] ?? CONST.BASE_DOCUMENT_TYPE;
    const types = {
      [defaultType]: game.i18n.localize("SIMPLE.NoTemplate")
    }
    for ( let a of templates ) {
      types[a.id] = a.name;
    }

    // Render the document creation form
    const template = "templates/sidebar/document-create.html";
    const html = await foundry.applications.handlebars.renderTemplate(template, {
      name: data.name || game.i18n.format("DOCUMENT.New", {type: label}),
      folder: data.folder,
      folders: folders,
      hasFolders: folders.length > 1,
      type: data.type || templates[0]?.id || "",
      types: types,
      hasTypes: true
    });

    // Render the confirmation dialog window
    return Dialog.prompt({
      title: title,
      content: html,
      label: title,
      callback: html => {

        // Get the form data
        const form = html[0].querySelector("form");
        const fd = new FormDataExtended(form);
        let createData = fd.object;

        // Merge with template data
        const template = collection.get(form.type.value);
        if ( template ) {
          createData = foundry.utils.mergeObject(template.toObject(), createData);
          createData.type = template.type;
          delete createData.flags.break.isTemplate;
        }

        // Merge provided override data
        createData = foundry.utils.mergeObject(createData, data, { inplace: false });
        return this.create(createData, {renderSheet: true});
      },
      rejectClose: false,
      options: options
    });
  }
}
