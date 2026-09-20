// Dynamic Create gem socketing. Construct each output from the actual tool
// and gem while preserving existing components, damage, and enchantments.
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
const CMW_EQUIPMENT_TYPES = ['pickaxe', 'axe', 'shovel', 'hoe', 'sword']
let cmwSocketRecipeSequence = 0

function cmwSocketRecipeId(equipment, gem) {
  cmwSocketRecipeSequence += 1
  return $CmwResourceLocation.parse(
    `createmyway:dynamic_gem_socketing/${equipment}/${gem.split(':')[1]}/${cmwSocketRecipeSequence}`
  )
}

// NativeEvents supplies native Minecraft ItemStacks, not necessarily KubeJS wrappers.
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
    if (String(part.get($CmwAllDataComponents.PART_TYPE.get())) === 'createmyway:gem') return part
  }
  return null
}

function cmwCanSocket(tool, part, registry) {
  const equipment = cmwEquipmentType(tool)
  const gem = cmwGemFromPart(part)
  if (!equipment || !gem || registry.materialParts[gem] !== 'createmyway:gem') return false
  const parts = cmwParts(tool)
  return !!(parts && !parts.isEmpty() && !cmwInstalledGem(parts) &&
    (registry.materialEquipment[gem] || []).includes(equipment))
}

// KubeJS Stack.set() JSON conversion cannot accept native Slag DataDynamicParts.
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

  // A search can be invoked while the Deployer's recipe inventory still
  // contains a previously held gem. Validate the *real* hand as well as the
  // recipe inventory before handing Create an actionable recipe. Reject every
  // invalid CMW socket combination (including an occupied socket) so an
  // ordinary item-application recipe cannot animate repeatedly in its place.
  const deployer = event.getBlockEntity()
  const player = deployer.getPlayer()
  const livePart = player ? player.getMainHandItem() : null
  if (!cmwCanSocket(tool, gemPart, registry) ||
      !cmwCanSocket(tool, livePart, registry) ||
      cmwGemFromPart(livePart) !== gem) {
    event.setCanceled(true)
    return
  }

  const level = deployer.getLevel()
  if (!level || level.isClientSide()) return
  const output = cmwSocketedCopy(tool, gemPart, gem, equipment, level)
  const outputGem = cmwInstalledGem(cmwParts(output))
  if (!outputGem || cmwGemFromPart(outputGem) !== gem) {
    // Never offer a malformed result to the Deployer.
    console.error(`[CreateMyWay] Gem socket preview mismatch for ${gem}.`)
    event.setCanceled(true)
    return
  }

  const recipeId = cmwSocketRecipeId(equipment, gem)
  // DeployerBlockEntity owns one reusable recipeInv. Every getRecipe() call
  // overwrites both slots, so never retain event.getInventory() in the delayed
  // result supplier. Component-sensitive copies make this recipe independent
  // from searches performed while the Deployer is animating.
  const recipeTool = tool.copy()
  const recipePart = gemPart.copy()
  const builder = new $CmwItemApplicationBuilder(params => new $CmwDeployerRecipe(params), recipeId)
  builder['require(net.minecraft.world.item.crafting.Ingredient)']($CmwComponentIngredient.of(true, recipeTool.copy()))
  builder['require(net.minecraft.world.item.crafting.Ingredient)']($CmwComponentIngredient.of(true, recipePart.copy()))
  // The live output supplier makes final validation. Keep Create from
  // automatically consuming the gem; consume it ONLY after that validation.
  // Otherwise an incompatible input would crash or silently lose a gem.
  builder.toolNotConsumed()
  const recipe = builder['output(net.minecraft.world.item.ItemStack)'](output).build()
  recipe.enforceNextResult(() => {
    const currentPlayer = deployer.getPlayer()
    const currentPart = currentPlayer ? currentPlayer.getMainHandItem() : null
    if (!cmwCanSocket(recipeTool, currentPart, registry) ||
        cmwGemFromPart(currentPart) !== gem) {
      // A hand/depot swap after search must never crash or consume a gem.
      // Normal invalid inputs are stopped above, before a recipe starts.
      return recipeTool.copy()
    }
    const currentOutput = cmwSocketedCopy(recipeTool, currentPart, gem, equipment, level)
    const installed = cmwInstalledGem(cmwParts(currentOutput))
    if (!installed || cmwGemFromPart(installed) !== gem) {
      console.error(`[CreateMyWay] Gem socket result mismatch for ${gem}; retaining input and gem.`)
      return recipeTool.copy()
    }
    // All validation and output construction completed successfully.
    currentPart.shrink(1)
    return currentOutput
  })
  const holder = new $CmwRecipeHolder(recipeId, recipe)
  event.addRecipe(() => $CmwOptional.of(holder), 1000)
})

// Right-click a powered Mechanical Saw to remove the gem from the held tool.
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
