
# BREAK!! System

A system to play the BREAK!! TTRPG on Foundry VTT.

FoundryVTT-Break is an independent product published under BREAK!! RPG’s Non-Commercial License and is not affiliated with BREAK!!’s creators or publishers.
![BREAK](https://github.com/user-attachments/assets/f62f98db-8637-4f11-bfad-c02c3a0da15f)
You can keep up to date with future changes on the thread of the [official BREAK!! discord server](https://discord.gg/XNMqvQGcu2)

## Using the system
### Settings
The first thing you should do in order to play after creating a world is configuring the system-specific settings.
![Settings](https://github.com/user-attachments/assets/21074c49-d9be-4e44-8a9a-e67fabac121f)
These settings will be used as template whenever a type is used during the creation of an item, however, non-standard values will not be overwritten. For example, "standard" weapons come preconfigured with a value of 10 coins. If you create a new weapon and set it to standard, the price will be adjusted to 10 coins. If you were to change the value of coins, it won't be adjusted anymore when changing types until it goes back to the proper value for the type. This will avoid overwriting customized content on your items.
> Some of the weapon types come preconfigured, as they're included in
> the preview PDF for free.
### Ailments
The system comes with an included "Ailment" compendium, this compendium is empty by default and can only contain FoundryVTT Active Effects (AE). Any AE placed in this compendium, will show up in the status effect submenu for tokens, replacing default Foundry status effects.
Keep in mind that, as the compendium is included in the system, it's contents might be lost between updates, so **it is recomended you keep your own separate compendium** in order to avoid accidents. 
 ### Actions
 This system has a custom feature called "Actions": they're used to represent any kind of action an actor can take, from attacks to abilities and consumables. Most of the items can contain Actions and adding an Action to an item will make it show up on the Action list for the actor it is attached to simply by owning it and nothing else.
 Actions can have Active Effects attached in order to apply them to the target actor upon resolution. This is a reference by ID and any modification to the original Active Effect will be reflected on the Actions. It is heavily recommended to keep a compendium built for Action Active Effects.
 ### Active Effects
 The system makes extensive use of Active Effects and tries to keep it as standard as possible with Foundry's default behaviour. Active Effects attached to items try to behave logically, that is, an equippable item will only apply it's Active Effects if it's actually equipped (for example weapons or armor) while abilities or quirks will automatically be applied.
 Here is a list of safe-to-use Active Effect keys:
 -  **system.attack.value** - Attack bonus
-   **system.defense.value** - Defense rating
-   **system.speed.value** - Speed rating
-   **system.hearts.max** - Max hearts
-   **system.hands.value** - Number of hands the actor has. This is used to determine how many items it can equip.
-   **system.slots.value** - Number of slots
-   **system.aptitudes.might.value** - Might
-   **system.aptitudes.deftness.value** - Deftness
-   **system.aptitudes.grit.value** - Grit
-   **system.aptitudes.insight.value** - Insight
-   **system.aptitudes.aura.value** - Aura
-   **system.allegiance.bright** - Bright allegiance points
-   **system.allegiance.dark** - Dark allegiance points

Any modification via Active Effects performed on an actor will be reflected in the corresponding BON./PEN. section of the sheet. Hovering over it will display a list of Active Effects and their values.
### Area movement
You can use the Foundry feature of "Regions" to simulate Areas. The system has a small layer over them and will display a new properties tab called "BREAK!!". These properties don't do anything as of now and will only display a visual indicator of the attached Area Conditions on scene. The default behaviour of the areas is untouched and you may use it as you please.
