/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheetV2}
 */
const {ItemSheetV2} = foundry.applications.sheets;
const {HandlebarsApplicationMixin} = foundry.applications.api;
export class BreakItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {

  //#region Actions
  static async onDeleteAbility(e) {
    this.item.onDeleteAbility(e);
  }

  static async onEditImage(event, target) {
    const field = target.dataset.field || "img"
    const current = foundry.utils.getProperty(this.document, field)

    const fp = new foundry.applications.apps.FilePicker({
      type: "image",
      current: current,
      callback: (path) => this.document.update({ [field]: path })
    })

    fp.render(true)
  }
  //#endregion
  /*_getHeaderButtons() {
    let buttons = super._getHeaderButtons();
    return [{
      label: "",
      class: "header-chat-button",
      icon: "fas fa-comment",
      onclick: ev => this._onChatButton(ev)
    }].concat(buttons);

  }*/

  _onChatButton(ev) {
    this.object.sendToChat();
  }

}
