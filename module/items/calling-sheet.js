import { BreakItemSheet } from "./item-sheet.js";

export class BreakCallingSheet extends BreakItemSheet {

    /** @inheritdoc */
    static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
        classes: ["break", "sheet", "calling"],
        template: "systems/break/templates/items/calling-sheet.hbs",
        tabs: [{navSelector: ".tabs", contentSelector: ".sheet-body", initial: "description"}],
        width: 650,
        height: 520,
        dragDrop: [{dragSelector: null, dropSelector: null}]
      });
    }
  
    /** @inheritdoc */
    activateListeners(html) {
      super.activateListeners(html);
      if ( !this.isEditable ) return;
      html.find(".delete-starting-ability").on("click", this.onDeleteStartingAbility.bind(this));
      html.find(".delete-elective-ability").on("click", this.onDeleteElectiveAbility.bind(this));
      html.find(".delete-allowance").on("click", this.onDeleteAllowance.bind(this));
      html.find(".add-rank").on("click", this.onAddAdvancementRank.bind(this));
      html.find(".remove-rank").on("click", this.onRemoveAdvancementRank.bind(this));
      html.find(".select-feature").on("click", this._onSelectFeature.bind(this));
      const editorOptions = {
        target: html.find('.html-editor')[0],
        min_height: 300,
        height: 400
      };
      if (typeof tinymce !== 'undefined') {
        tinymce.init(editorOptions);
      }
      html.on('blur', '.advancement-input', this.updateAdvancement.bind(this));
    }

    async updateAdvancement(event) {
        const element = event.currentTarget;

        let idParts = element.id.split('-');
        let stat = idParts[0];
        let index = parseInt(idParts[1], 10);

        let value = parseInt(element.value, 10);
        switch(stat) {
            case "attack": this.item.system.advancementTable[index].attack = value; break;
            case "hearts": this.item.system.advancementTable[index].hearts = value; break;
            case "might": this.item.system.advancementTable[index].might = value; break;
            case "deftness": this.item.system.advancementTable[index].deftness = value; break;
            case "grit": this.item.system.advancementTable[index].grit = value; break;
            case "insight": this.item.system.advancementTable[index].insight = value; break;
            case "aura": this.item.system.advancementTable[index].aura = value; break;
            case "startingAbilites": this.item.system.advancementTable[index].startingAbilites = value; break;
            case "standardAbilities": this.item.system.advancementTable[index].standardAbilities = value; break;
            case "advancedAbilities": this.item.system.advancementTable[index].advancedAbilities = value; break;
            case "xp": this.item.system.advancementTable[index].xp = value; break;
        }

      this.item.update({ "system.advancementTable": this.item.system.advancementTable }, { render: false });
    }

    async onDeleteStartingAbility(event) {
      event.preventDefault();
      const index = parseInt(event.currentTarget.id.split('-')[1], 10);
      this.item.system.startingAbilities.splice(index, 1);
      this.item.update({"system.startingAbilities": this.item.system.startingAbilities});
    }

    async onDeleteElectiveAbility(event) {
      event.preventDefault();
      const index = parseInt(event.currentTarget.id.split('-')[1], 10);
      this.item.system.abilities.splice(index, 1);
      this.item.update({"system.abilities": this.item.system.abilities});
    }

    async onDeleteAllowance(event) {
      event.preventDefault();
      const ids = event.currentTarget.id.split('-');

      if (ids[0] === "armor") {
        let index = this.item.system.armorAllowances?.findIndex(i => i._id === ids[1]);
        if (index >= 0) {
          this.item.system.armorAllowances.splice(index, 1);
          this.item.update({"system.armorAllowances": this.item.system.armorAllowances});
        } else {
          index = this.item.system.shieldAllowances?.findIndex(i => i._id === ids[1]);
          this.item.system.shieldAllowances.splice(index, 1);
          this.item.update({"system.shieldAllowances": this.item.system.shieldAllowances});
        }
      } else {
        const index = this.item.system.weaponAllowances?.findIndex(i => i._id === ids[1]);
        this.item.system.weaponAllowances.splice(index, 1);
        this.item.update({"system.weaponAllowances": this.item.system.weaponAllowances});
      }
    }

    async onRemoveAdvancementRank(event) {
      event.preventDefault();
      const table = this.item.system.advancementTable;
      table.pop();
      this.item.update({"system.advancementTable": table});
    }

    async onAddAdvancementRank(event) {
      event.preventDefault();
      
      const table = this.item.system.advancementTable ?? []
      table.push({
        rank: table.length + 1,
        attack: 0,
        hearts: 0,
        might: 0,
        deftness: 0,
        grit: 0,
        insight: 0,
        aura: 0,
        xp: 1
      });
      this.item.update({"system.advancementTable": table});
    }

    async _onSelectFeature(event) {
      event.preventDefault();
      const featureType = event.currentTarget.id;

      function selectFeature(actor, item) {
        actor.createEmbeddedDocuments("Item", [item.toObject()]);
      }

      function getItemsList(featureType, actor) {
        switch (featureType) {
          case "history":
            return actor.system.homeland?.system?.histories && actor.system.homeland.system.histories.length > 0 ? actor.system.homeland.system.histories : game.items;
          default:
            return game.items;
        }
      }

      const buttons = {}
      const items = getItemsList(featureType, this.actor);

      for (const item of items) {
        if (item.type === featureType) {
          buttons[item._id] = {
            label: item.name,
            callback: (_) => selectFeature(this.actor, item)
          }
        }
      }

      const content = `
        <style>
        #featureSelector .dialog-buttons {
          flex-direction: column
        }
        </style>
      `

      const options = {
        id: "featureSelector",
        resizable: true
      }

      new Dialog({
        title: "Feature Selector",
        content: content,
        buttons: buttons
      }, options).render(true);
    }

    /** @inheritdoc */
    async getData(options) {
        const context = await super.getData(options);
        context.descriptionHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.item.system.description, {
            secrets: this.document.isOwner,
            async: true
        });
        context.advancementTable = context.item.system.advancementTable ?? [];

        context.startingAbilities = context.item.system.startingAbilities ?? [];
        context.hasStartingAbilities = context.startingAbilities.length > 0;
        context.electiveAbilities = context.item.system.abilities ?? [];
        context.hasElectiveAbilities = context.electiveAbilities.length > 0;

        context.armorAllowances = (context.item.system.armorAllowances ?? []).concat(context.item.system.shieldAllowances);
        context.hasArmorAllowances = context.armorAllowances.length > 0;
        
        context.meleeAllowances = [];
        context.missileAllowances = [];
        const weaponAllowances = context.item.system.weaponAllowances ?? [];
        for (let a of weaponAllowances) {
          
          if (a.system.ranged) {
            context.missileAllowances.push(a);
          } else {
            context.meleeAllowances.push(a);
          }
        }
        context.hasMeleeAllowances = context.meleeAllowances.length > 0;
        context.hasMissileAllowances = context.missileAllowances.length > 0;

        return context;
    }

    /** @inheritdoc */
    async _onDrop(event) {
        const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
        if(data.type !== "Item") return;
        const draggedItem = await fromUuid(data.uuid);

        if(draggedItem.type === "ability") {
          if(event.target.id === "startingAbilities") {
            const sa = this.item.system.startingAbilities ?? [];
            sa.push(draggedItem.toObject());
            this.item.update({"system.startingAbilities": sa});
          } else if (event.target.id === "electiveAbilities") {
            const sa = this.item.system.abilities ?? [];
            sa.push(draggedItem.toObject());
            this.item.update({"system.abilities": sa});
          }
        } else if(draggedItem.type === "weapon-type") {
          const wpns = this.item.system.weaponAllowances ?? [];
          if (!wpns.some(w => w._id === draggedItem._id)) {
            wpns.push(draggedItem.toObject());
            this.item.update({"system.weaponAllowances": wpns});
          }
        } else if(draggedItem.type === "armor-type") {
          const armr = this.item.system.armorAllowances ?? [];
          if (!armr.some(w => w._id === draggedItem._id)) {
            armr.push(draggedItem.toObject());
            this.item.update({"system.armorAllowances": armr});
          }
        } else if(draggedItem.type === "shield-type") {
          const shld = this.item.system.shieldAllowances ?? [];
          if (!shld.some(w => w._id === draggedItem._id)) {
            shld.push(draggedItem.toObject());
            this.item.update({"system.shieldAllowances": shld});
          }
        }
    }

    /** @override */
    _getSubmitData(updateData) {
        let formData = super._getSubmitData(updateData);
        return formData;
    }
}
