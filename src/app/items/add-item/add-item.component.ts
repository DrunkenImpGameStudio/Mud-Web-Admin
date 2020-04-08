import { Component, OnInit, ViewChild, NgZone, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormArray } from '@angular/forms';
import { Store, select } from '@ngrx/store';
import { FormControl } from '@angular/forms';
import {
    takeWhile,
    take,
    startWith,
    map,
    switchMap,
    debounceTime,
    distinctUntilChanged
} from 'rxjs/operators';
import { ItemType } from '../interfaces/item-type.interface';
import { ItemAppState } from '../state/add-item.state';
import {
    GetItemTypes,
    GetItemSlotTypes,
    GetArmourTypes,
    PostItem,
    PostItemSuccess,
    GetFlags,
    GetWeaponTypes,
    GetDamageTypes,
    GetAttackTypes
} from '../state/add-item.actions';
import {
    getItemTypes,
    getItemSlotTypes,
    getArmourTypes,
    getFlags,
    getWeaponTypes,
    getDamageTypes,
    getAttackTypes
} from '../state/add-item.selector';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { Item } from '../interfaces/item.interface';
import { Observable } from 'rxjs';
import { ItemService } from './add-item.service';
import { ActivatedRoute } from '@angular/router';
import { FlagEnum } from '../interfaces/flags.enums';

@Component({
    templateUrl: './add-item.component.html',
    styleUrls: ['./add-item.component.scss']
})
export class AddItemComponent implements OnDestroy, OnInit {
    componentActive = true;
    itemForm: FormGroup;
    itemTypes: ItemType[];
    itemSlotTypes: ItemType[];
    armourTypes: ItemType[];
    weaponTypes: ItemType[];
    attackTypes: ItemType[];
    damageTypes: ItemType[];
    flags: ItemType[];
    containerSize: ItemType[];
    containerCanBeOpened = false;
    containerCanBeLocked = false;
    lockStrength: ItemType[];
    pages: number[] = [];
    showWeaponSection = false;
    showArmourSection = false;
    showBookSection = false;
    showContainerSection = false;
    containerItems: Item[] = [];
    options: Item[] = [];
    filteredOptions: Observable<Item[]>;
    findKeyOptions: Observable<Item[]>;
    selectedItem: Item;
    selectedFlag: FlagEnum;
    selectedFlags: FlagEnum[] = [];
    currentItemTypeValue: any;

    constructor(
        private changeDetector: ChangeDetectorRef,
        private formBuilder: FormBuilder,
        private ngZone: NgZone,
        private store: Store<ItemAppState>,
        private itemService: ItemService,
        private route: ActivatedRoute
    ) { }
    @ViewChild('autosize')
    autosize: CdkTextareaAutosize;

    ngOnInit() {

        this.itemForm = this.formBuilder.group({
            id: [''],
            name: ['', Validators.required],
            knownByName: [''],
            itemType: [null, Validators.required],
            itemSlotType: [null],
            level: [''],
            weaponType: [''],
            attackType: [''],
            damageType: ['', Validators.required],
            minDamage: ['', [Validators.min(1), Validators.max(50)]],
            maxDamage: ['', [Validators.min(1), Validators.max(100)]],
            armourType: [''],
            acPierce: [''],
            acBash: [''],
            acSlash: [''],
            acMagic: [''],
            hitRoll: [''],
            damRoll: [''],
            saves: [''],
            hpMod: [''],
            manaMod: [''],
            movesMod: [''],
            spellMod: [''],
            pageCount: [1],
            pages: new FormGroup({}),
            flags: new FormGroup({}),
            lookDescription: ['', Validators.required],
            roomDescription: [''],
            examDescription: [''],
            smellDescription: [''],
            touchDescription: [''],
            tasteDescription: [''],
            selectContainerItem: [''],
            containerGP: [''],
            containerOpen: [''],
            containerLocked: [''],
            containerCanLock: [''],
            containerCanOpen: [''],
            lockStrength: [''],
            containerSize: [''],
            selectContainerKey: ['']
        });


        this.filteredOptions = this.itemForm
            .get('selectContainerItem')
            .valueChanges.pipe(
                startWith(''),
                debounceTime(200),
                distinctUntilChanged(),
                switchMap(name => {
                    if (typeof name !== 'string' || name == null) {
                        return;
                    }
                    return this._filter(name);
                })
            );

        this.findKeyOptions = this.itemForm
            .get('selectContainerKey')
            .valueChanges.pipe(
                startWith(''),
                debounceTime(200),
                distinctUntilChanged(),
                switchMap(name => {
                    if (typeof name !== 'string' || name == null) {
                        return;
                    }
                    return this._filterKeys(name);
                })
            );



        this.itemForm.get('containerCanOpen').valueChanges.subscribe(value => {
            this.containerCanBeOpened = !this.containerCanBeOpened;
            if (!this.containerCanBeOpened) {
                this.itemForm.get('containerOpen').setValue(false);
            }
        });

        this.itemForm.get('containerCanLock').valueChanges.subscribe(value => {

            console.log("container", value)
            this.containerCanBeLocked = !this.containerCanBeLocked;
            if (!this.containerCanBeLocked) {
                this.itemForm.get('containerLocked').setValue(false);
            }
        });

        this.store.dispatch(new GetFlags());


        this.store
            .pipe(
                select(getFlags),
                takeWhile(() => this.componentActive)
            )
            .subscribe((flagArr: ItemType[]) => {
                this.flags = flagArr;

                this.flags.forEach(flag => {
                    (this.itemForm.controls['flags'] as FormGroup).addControl(
                        flag.name,
                        new FormControl()
                    );
                });
                //  console.log(this.itemForm)
            });

        this.itemService.getContainerSize().subscribe(containerSizeData => {
            this.containerSize = containerSizeData;
        });

        this.itemService.getLockStrength().subscribe(lockStrengthData => {
            this.lockStrength = lockStrengthData;
        });


        if (this.selectedItem == null) {
            this.addPage();
        }


        this.itemForm.get('itemType').valueChanges.subscribe(value => {
            this.toggleItemSection(value);
        });

    }

    private _filter(value: string): Observable<Item[]> {
        return this.itemService.autocompleteItems(value);
    }

    private _filterKeys(value: string): Observable<Item[]> {
        return this.itemService.findKeyItems(value);
    }

    displayFn(item?: Item): string | undefined {
        console.log('f', item);
        return item != null ? item.name : undefined;
    }

    displayKeys(item?: Item): string | undefined {

        console.log('hello', item);
        return item != null ? item.name : undefined;
    }

    public findInvalidControls() {
        const invalid = [];
        const controls = this.itemForm.controls;
        for (const name in controls) {
            if (controls[name].invalid) {
                invalid.push(name);
            }
        }
        console.log(invalid);
    }
    get getFlagControl(): FormArray {
        return this.itemForm.get('flags') as FormArray;
    }

    get getPageControl(): FormArray {
        return this.itemForm.get('pages') as FormArray;
    }


    hasFlag(flag: number): boolean {
        return this.itemService.hasFlag(flag, this.selectedFlag);
    }

    isFlagSet(value: number, flag: number): boolean {
        return (value & flag) !== 0;
    }


    addFlag() {
        this.getFlagControl.push(this.formBuilder.control(''));
    }

    addPage() {
        console.log('page count', this.pages.length);
        this.pages.push(1);
        let i = 0;
        this.pages.forEach(() => {
            (this.itemForm.controls['pages'] as FormGroup).addControl(
                `page${i}`,
                new FormControl(this.selectedItem != null ? this.selectedItem.book.pages[i] : '')
            );
            i++;
        });
    }

    addItemToContainer() {
        const item = this.itemForm.get('selectContainerItem').value;
        if (item == null) {
            return;
        }

        this.containerItems = this.containerItems.concat(item);
    }

    removeItemFromContainer(index: number) {
        this.containerItems.splice(index, 1);
    }

    ngOnDestroy(): void {
        this.componentActive = false;
        this.changeDetector.detach();
        this.itemForm = null;
        console.log("??")
    }

    triggerResize() {
        // Wait for changes to be applied, then trigger textarea resize.
        this.ngZone.onStable
            .pipe(take(1))
            .subscribe(() => this.autosize.resizeToFitContent(true));
    }

    toggleItemSection(event: any) {

        if (event == null) {
            return;
        }

        const itemType = event.id;

        console.log(itemType);

        this.itemForm.get('armourType').disable();
        this.showArmourSection = false;
        this.itemForm.get('weaponType').disable();
        this.itemForm.get('attackType').disable();
        this.itemForm.get('damageType').disable();
        this.itemForm.get('minDamage').disable();
        this.itemForm.get('maxDamage').disable();
        this.showWeaponSection = false;
        this.showBookSection = false;
        this.itemForm.get('pageCount').disable();
        this.showContainerSection = false;
        this.itemForm.get('containerSize').disable();

        if (itemType === 0) {
            this.showArmourSection = true;
            this.itemForm.get('armourType').enable();
        } else if (itemType === 11) {
            this.showWeaponSection = true;

            this.itemForm.get('weaponType').enable();
            this.itemForm.get('attackType').enable();
            this.itemForm.get('damageType').enable();
            this.itemForm.get('minDamage').enable();
            this.itemForm.get('maxDamage').enable();
        } else if (itemType === 1) {
            this.showBookSection = true;
            this.itemForm.get('pageCount').enable();
        } else if (itemType === 2) {
            this.showContainerSection = true;
            this.itemForm.get('containerSize').enable();
        }

        this.itemForm.updateValueAndValidity();
        this.changeDetector.markForCheck();

        this.findInvalidControls();
    }

    updateSelectedFlags(flag: number) {

        if (this.selectedFlags.length && this.selectedFlags.includes(flag)) {
            this.selectedFlags = this.selectedFlags.filter(flagToRemove => flagToRemove !== flag);
        } else {
            this.selectedFlags.push(flag);
        }

        console.log(this.selectedFlags);
    }

    calculateAverageDamage(min = 1, max = 1) {
        return this.itemService.averageDamage(min, max);
    }

    calculateSpellProtection(armour: number) {
        const protection = Math.floor(armour / 2) || 0;
        this.itemForm.get('acMagic').setValue(protection);
        return protection;
    }

    addItem() {
        const pages: string[] = [];
        let flags: any;

        Object.keys(this.itemForm.get('pages').value).forEach(page => {
            console.log(this.itemForm.get('pages').value[page]);
            pages.push(this.itemForm.get('pages').value[page]);
        });

        flags = this.selectedFlags.reduce((a, b) => a + b, 0);

        console.log('FLAGS' + flags);

        console.log(this.itemForm.get('roomDescription').value);
        const item: Item = {
            id: this.itemForm.get('id').value || -1,
            name: this.itemForm.get('name').value,
            knownByName: this.itemForm.get('knownByName').value || false,
            itemType: this.itemForm.get('itemType').value.id,
            slot: this.itemForm.get('itemSlotType').value.id || 0,
            container: {
                associatedKeyId: this.itemForm.get('selectContainerKey').value.keyId,
                canLock: this.itemForm.get('containerCanLock').value || false,
                canOpen: this.itemForm.get('containerCanOpen').value || false,
                lockDifficulty: +this.itemForm.get('lockStrength').value || 0,
                items: this.containerItems,
                size: +this.itemForm.get('containerSize').value || 0,
                isLocked: this.itemForm.get('containerLocked').value || false,
                isOpen: this.itemForm.get('containerOpen').value || false,
                goldPieces: this.itemForm.get('containerGP').value || 0,
            },
            book: {
                pageCount: this.itemForm.get('pageCount').value || 0,
                pages: pages,
                blank: this.itemForm.get('pages').value.length > 1
            },
            description: {
                room: this.itemForm.get('roomDescription').value,
                exam: this.itemForm.get('examDescription').value,
                look: this.itemForm.get('lookDescription').value,
                smell: this.itemForm.get('smellDescription').value,
                taste: this.itemForm.get('tasteDescription').value,
                touch: this.itemForm.get('touchDescription').value
            },
            armourType: this.itemForm.get('armourType').value.id || 0,
            armourRating: {
                armour: this.itemForm.get('acPierce').value || 1,
                magic: Math.floor(this.itemForm.get('acPierce').value / 2) || 0
            },
            attackType: this.itemForm.get('attackType').value || 0,
            damage: {
                maximum: this.itemForm.get('maxDamage').value || 1,
                minimum: this.itemForm.get('minDamage').value || 1
            },
            weaponType: this.itemForm.get('weaponType').value || 0,
            condition: 1,
            containerItems: [],
            damageType: this.itemForm.get('damageType').value || 0,
            decayTimer: 2,
            forageRank: 0,
            hidden: false,
            infinite: false,
            isHiddenInRoom: false,
            itemFlag: flags,
            keywords: [],
            level: this.itemForm.get('level').value || 1,
            modifier: {
                damRoll: this.itemForm.get('damRoll').value || 0,
                hitRoll: this.itemForm.get('hitRoll').value || 0,
                hp: this.itemForm.get('hpMod').value || 0,
                mana: this.itemForm.get('manaMod').value || 0,
                moves: this.itemForm.get('movesMod').value || 0,
                spellDam: this.itemForm.get('spellMod').value || 0,
                saves: this.itemForm.get('saves').value || 0,
            },
            questItem: false,
            stuck: false,
            uses: 0,
            weight: 5,
            equipped: false
        };

        this.store.dispatch(new PostItem(item));
    }
}
