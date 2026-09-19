// Dynamic Create gem socketing. Each recipe is built from the actual tool stack
// to preserve its damage, custom name, components, and player enchantments.

const $CmwDeployerRecipeSearchEvent = Java.loadClass('com.simibubi.create.content.kinetics.deployer.DeployerRecipeSearchEvent')
const $CmwDeployerRecipe = Java.loadClass('com.simibubi.create.content.kinetics.deployer.DeployerApplicationRecipe')
const $CmwItemApplicationBuilder = Java.loadClass('com.simibubi.create.content.kinetics.deployer.ItemApplicationRecipe$Builder')
const $CmwRecipeHolder = Java.loadClass('net.minecraft.world.item.crafting.RecipeHolder')
const $CmwComponentIngredient = Java.loadClass('net.neoforged.neoforge.common.crafting.DataComponentIngredient')
const $CmwBuiltInRegistries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries')
const $CmwOptional = Java.loadClass('java.util.Optional')
const $CmwResourceLocation = Java.loadClass('net.minecraft.resources.ResourceLocation')
const $CmwDataDynamicParts = Java.loadClass('dev.lopyluna.slag.content.items.modular.DataDynamicParts')
const $CmwAllDataComponents = Java.loadClass('dev.lopyluna.slag.register.AllDataComponents')
const $CmwDataComponents = Java.loadClass('net.minecraft.core.component.DataComponents')
const $CmwCustomData = Java.loadClass('net.minecraft.world.item.component.CustomData')
const $CmwCompoundTag = Java.loadClass('net.minecraft.nbt.CompoundTag')
const $CmwRegistries = Java.loadClass('net.minecraft.core.registries.Registries')
const $CmwEnchantmentHelper = Java.loadClass('net.minecraft.world.item.enchantment.EnchantmentHelper')
const $CmwMutableEnchantments = Java.loadClass('net.minecraft.world.item.enchantment.ItemEnchantments$Mutable')
const $CmwInteractionHand = Java.loadClass('net.minecraft.world.InteractionHand')

const CMW_SOCKET_DATA = 'cmw_socket'
const CMW_DYNAMIC_RECIPE_ID = $CmwResourceLocation.parse('createmyway:dynamic_gem_socketing')
const CMW_EQUIPMENT_TYPES = ['pickaxe', 'axe', 'shovel', 'hoe', 'sword']

// DeployerRecipeSearchEvent supplies native Minecraft ItemStacks, not necessarily
// KubeJS-wrapped event items. Resolve IDs through the vanilla item registry.
function cmwItemId(stack) {
  return stack && !stack.isEmpty() ? String($CmwBuiltInRegistries.ITEM.getKey(stack.getItem())) : ''
}

function cmwEquipmentType(stack) {
  if (cmwItemId(stack) !== 'slag:modular_item') return null
  const value = stack.get($CmwAllDataComponents.MODULAR_TYPE.get())
  const equipment = value ? String(value).replace(/^slag:/, '') : ''
  return CMW_EQUIPMENT_TYPES.includes(equipment) ? equipment : null
}

function cmwParts(stack) {
  if (cmwItemId(stack) !== 'slag:modular_item') return null
  return stack.get($CmwAllDataComponents.DYNAMIC_PARTS.get())
}

function cmwGemFromPart(stack) {
  if (cmwItemId(stack) !== 'slag:dynamic_part') return null
  const part = stack.get($CmwAllDataComponents.PART_TYPE.get())
  const material = stack.get($CmwAllDataComponents.MATERIAL_TYPE.get())
  if (!material || String(part) !== 'createmyway:gem') return null
  return String(material)
}

function cmwInstalledGem(parts) {
  if (!parts) return null
  for (const part of parts.items()) {
    if (String(part.get($CmwAllDataComponents.PART_TYPE.get())) === 'createmyway:gem') {
      return part
    }
  }
  return null
}

// KubeJS remaps ItemStack.set() to a JSON-based component wrapper. Native
// ResourceLocations and Slag's DataDynamicParts cannot pass through that wrapper.
// The existing stack's mutable component map accepts these already-typed values.
function cmwSetNativeComponent(stack, component, value) {
  stack.getComponents().set(component, value)
}

function cmwEnchantmentHolder(level, id) {
  const registry = level.registryAccess().registryOrThrow($CmwRegistries.ENCHANTMENT)
  return registry.getHolder($CmwResourceLocation.parse(id)).orElse(null)
}

function cmwApplyGemEnchantments(stack, gem, equipment, level) {
  const registry = global.cmwEquipmentRegistry
  const effect = (((registry.materialEffects || {})[gem] || {})[equipment] || {})
  const grants = effect.enchantments || {}
  const mutable = new $CmwMutableEnchantments(stack.getEnchantments())
  const previousTag = new $CmwCompoundTag()
  const grantedTag = new $CmwCompoundTag()

  Object.keys(grants).forEach(id => {
    const holder = cmwEnchantmentHolder(level, id)
    if (!holder) return
    const previous = mutable.getLevel(holder)
    const granted = grants[id]
    previousTag.putInt(id, previous)
    grantedTag.putInt(id, granted)
    if (granted > previous) mutable.set(holder, granted)
  })
  $CmwEnchantmentHelper.setEnchantments(stack, mutable.toImmutable())

  $CmwCustomData.update($CmwDataComponents.CUSTOM_DATA, stack, root => {
    const socket = new $CmwCompoundTag()
    socket.putString('gem', gem)
    socket.put('previous_enchantments', previousTag)
    socket.put('granted_enchantments', grantedTag)
    root.put(CMW_SOCKET_DATA, socket)
  })
}

function cmwRestoreGemEnchantments(stack, level) {
  const data = stack.get($CmwDataComponents.CUSTOM_DATA)
  if (!data || !data.contains(CMW_SOCKET_DATA)) return
  const socket = data.copyTag().getCompound(CMW_SOCKET_DATA)
  const previousTag = socket.getCompound('previous_enchantments')
  const grantedTag = socket.getCompound('granted_enchantments')
  const mutable = new $CmwMutableEnchantments(stack.getEnchantments())

  grantedTag.getAllKeys().forEach(id => {
    const holder = cmwEnchantmentHolder(level, String(id))
    if (!holder) return
    const current = mutable.getLevel(holder)
    const granted = grantedTag.getInt(String(id))
    const previous = previousTag.getInt(String(id))
    // Keep any enchantment the player upgraded above the socket's granted level.
    if (current <= granted) mutable.set(holder, previous)
  })
  $CmwEnchantmentHelper.setEnchantments(stack, mutable.toImmutable())
  $CmwCustomData.update($CmwDataComponents.CUSTOM_DATA, stack, root => root.remove(CMW_SOCKET_DATA))
}

function cmwSocketedCopy(tool, gemPart, gem, equipment, level) {
  const result = tool.copy()
  const parts = cmwParts(result).itemsCopy()
  const installedPart = gemPart.copy()
  installedPart.setCount(1)
  cmwSetNativeComponent(installedPart, $CmwAllDataComponents.BUILT.get(), $CmwResourceLocation.parse(`slag:${equipment}`))

  let handleIndex = parts.size()
  for (let index = 0; index < parts.size(); index++) {
    if (String(parts.get(index).get($CmwAllDataComponents.PART_TYPE.get())) === 'createmyway:handle') {
      handleIndex = index
      break
    }
  }
  parts.add(handleIndex, installedPart)
  cmwSetNativeComponent(result, $CmwAllDataComponents.DYNAMIC_PARTS.get(), new $CmwDataDynamicParts(parts))
  cmwApplyGemEnchantments(result, gem, equipment, level)
  return result
}

NativeEvents.onEvent($CmwDeployerRecipeSearchEvent, event => {
  const inventory = event.getInventory()
  const tool = inventory.getItem(0)
  const gemPart = inventory.getItem(1)
  const registry = global.cmwEquipmentRegistry
  if (!registry) return

  const equipment = cmwEquipmentType(tool)
  const gem = cmwGemFromPart(gemPart)
  if (!equipment || !gem || registry.materialParts[gem] !== 'createmyway:gem') return
  const parts = cmwParts(tool)
  if (!parts || parts.isEmpty() || cmwInstalledGem(parts)) return
  if (!(registry.materialEquipment[gem] || []).includes(equipment)) return

  const level = event.getBlockEntity().getLevel()
  if (!level || level.isClientSide()) return
  const output = cmwSocketedCopy(tool, gemPart, gem, equipment, level)
  const builder = new $CmwItemApplicationBuilder(
    params => new $CmwDeployerRecipe(params),
    CMW_DYNAMIC_RECIPE_ID
  )
  // Create's builder overloads require(...) for ItemLike, Ingredient and fluid
  // inputs. Rhino finds them ambiguous even when passed an Ingredient. Select
  // the exact Ingredient overload while keeping full component-sensitive inputs.
  builder['require(net.minecraft.world.item.crafting.Ingredient)']($CmwComponentIngredient.of(true, tool.copy()))
  builder['require(net.minecraft.world.item.crafting.Ingredient)']($CmwComponentIngredient.of(true, gemPart.copy()))
  const recipe = builder['output(net.minecraft.world.item.ItemStack)'](output).build()
  const holder = new $CmwRecipeHolder(CMW_DYNAMIC_RECIPE_ID, recipe)
  event.addRecipe(() => $CmwOptional.of(holder), 1000)
})

// Create has no dynamic cutting-recipe hook. Right-clicking a powered Mechanical
// Saw performs the reversible removal while preserving the exact held tool.
BlockEvents.rightClicked('create:mechanical_saw', event => {
  if (event.hand !== $CmwInteractionHand.MAIN_HAND || event.level.isClientSide()) return
  const tool = event.item
  const partsData = cmwParts(tool)
  const gemPart = cmwInstalledGem(partsData)
  if (!gemPart) return

  const saw = event.block.entity
  if (!saw || saw.getSpeed() === 0) {
    event.player.displayClientMessage(Text.red('The Mechanical Saw must be running to remove a gem.'), true)
    return
  }

  const remaining = partsData.itemsCopy()
  let removed = null
  for (let index = 0; index < remaining.size(); index++) {
    if (String(remaining.get(index).get($CmwAllDataComponents.PART_TYPE.get())) === 'createmyway:gem') {
      removed = remaining.remove(index)
      break
    }
  }
  if (!removed) return

  cmwSetNativeComponent(tool, $CmwAllDataComponents.DYNAMIC_PARTS.get(), new $CmwDataDynamicParts(remaining))
  cmwRestoreGemEnchantments(tool, event.level)
  removed.remove($CmwAllDataComponents.BUILT.get())
  removed.setCount(1)
  event.block.popItemFromFace(removed, event.facing)
  event.player.displayClientMessage(Text.green('Gem removed by the Mechanical Saw.'), true)
  event.cancel()
})
