/* Blobby constants. Values mirror VS Code src/vs/workbench/contrib/chat/browser/widget/chatPetWidget.ts. */

const CHAT_PET_STATES = [
	'idle', 'sleep', 'waking', 'typing', 'rendering', 'painting', 'achievementUnlocked',
	'buttonPress', 'complete', 'love', 'clapping', 'jump', 'cool', 'yapping',
	'yappingMouthOpen', 'sing', 'speechless', 'worry', 'dizzy', 'falling', 'wallImpact',
	'splat', 'onTheRun', 'searching', 'searchingDown',
]

const CHAT_PET_IDLE_SLEEP_DELAY = 20000
const CHAT_PET_CONFIRMATION_ATTENTION_DURATION = 2000
const CHAT_PET_ACHIEVEMENT_UNLOCKED_DURATION = 10000
const CHAT_PET_ICON_TRANSFORMATION_CHANCE = 1 / 100
const CHAT_PET_YAPPING_CHANCE = 1 / 100
const CHAT_PET_WALL_IMPACT_DURATION = 48
const CHAT_PET_MOUSE_BOUNCE_RELEASE_GRACE_DURATION = 500
const CHAT_PET_BOUNCE_RESULT_DURATION = 5000
const CHAT_PET_CONFETTI_SCORE = 20
const TRANSIENT_STATE_DURATION = 2000
const COMPLETE_STATE_DURATION = 960
const BUTTON_PRESS_STATE_DURATION = 2850
const SPLAT_STATE_DURATION = 520
const LOVE_STATE_DURATION = 2940
const COOL_STATE_DURATION = 3000
const SING_STATE_DURATION = 2880
const SPEECHLESS_STATE_DURATION = 2720
const WORRY_STATE_DURATION = 2400
const DIZZY_STATE_DURATION = 2200
const WAKE_STATE_DURATION = 880
const DIZZY_DIRECTION_CHANGE_COUNT = 8
const DIZZY_DIRECTION_CHANGE_MAX_INTERVAL = 600
const RESPAWN_EFFECT_DURATION = 800
const RESPAWN_EFFECT_REDUCED_MOTION_DURATION = 400
const DRAG_THRESHOLD = 2
const HOP_DISTANCE = 24
const HOP_APEX_DELAY = 300
const HOP_REST_DELAY = 90
const HOP_HOLD_GRACE = 350
const HOP_IDLE_DEBOUNCE = 900
const BLINK_MIN_DELAY = 1400
const BLINK_MAX_DELAY = 3400
const THROW_VELOCITY_SAMPLE_DURATION = 100
const THROW_RELEASE_GRACE_DURATION = 80
const THROW_MIN_VELOCITY = 650
const THROW_MAX_VELOCITY = 2400
const THROW_KEYBOARD_HORIZONTAL_VELOCITY = 1400
const THROW_KEYBOARD_UPWARD_VELOCITY = 420
const THROW_GRAVITY = 1800
const THROW_MAX_FRAME_DURATION = 32
const THROW_MAX_DURATION = 4000
const THROW_WALL_RESTITUTION = 0.2
const THROW_CEILING_RESTITUTION = 0.2
const THROW_ROTATION_PER_PIXEL = 0.65
const THROW_SELF_RIGHTING_START_VELOCITY = -450
const THROW_SELF_RIGHTING_SPEED = 720
const MOUSE_BOUNCE_MIN_UPWARD_VELOCITY = 760
const MOUSE_BOUNCE_MAX_UPWARD_VELOCITY = 1800
const MOUSE_BOUNCE_VERTICAL_RESTITUTION = 0.65
const MOUSE_BOUNCE_UPWARD_TRANSFER = 0.4
const MOUSE_BOUNCE_HORIZONTAL_RETENTION = 0.65
const MOUSE_BOUNCE_HORIZONTAL_TRANSFER = 0.35
const MOUSE_BOUNCE_EDGE_KICK = 320
const MOUSE_BOUNCE_MAX_HORIZONTAL_VELOCITY = 1800

const CHAT_PET_DISPLAY_SIZE = 48
const CHAT_PET_SOURCE_SIZE = 96
const CHAT_PET_SLEEP_SOURCE_WIDTH = 120
const CHAT_PET_TYPING_SOURCE_WIDTH = 168
const CHAT_PET_PAINTING_SOURCE_WIDTH = 192
const CHAT_PET_BUTTON_PRESS_SOURCE_WIDTH = 160
const CHAT_PET_SING_SOURCE_WIDTH = 164
const CHAT_PET_SING_SOURCE_HEIGHT = 124
const CHAT_PET_DIZZY_SOURCE_HEIGHT = 128
const CHAT_PET_MAX_VERTICAL_OFFSET = 10
const CHAT_PET_DEFAULT_RIGHT_INSET = 32
const CHAT_PET_MIN_SCALE = 0.4
const CHAT_PET_SCALE_STEP = 0.2
const CHAT_PET_SPEECH_BUBBLE_RIGHT_OVERHANG = 20
const CHAT_PET_SLEEP_RIGHT_OVERHANG = (CHAT_PET_SLEEP_SOURCE_WIDTH - CHAT_PET_SOURCE_SIZE) / 2
const CHAT_PET_TYPING_RIGHT_OVERHANG = (CHAT_PET_TYPING_SOURCE_WIDTH - CHAT_PET_SOURCE_SIZE) / 2
const CHAT_PET_PAINTING_RIGHT_OVERHANG = (CHAT_PET_PAINTING_SOURCE_WIDTH - CHAT_PET_SOURCE_SIZE) / 2
const CHAT_PET_BUTTON_PRESS_RIGHT_OVERHANG = (CHAT_PET_BUTTON_PRESS_SOURCE_WIDTH - CHAT_PET_SOURCE_SIZE) / 2
const CHAT_PET_SING_RIGHT_OVERHANG = (CHAT_PET_SING_SOURCE_WIDTH - CHAT_PET_SOURCE_SIZE) / 2
const CHAT_PET_HEAD_WEAR_OFFSET = 8

const IDLE_FRAME_DURATIONS = Array.from({ length: 50 }, () => 40)
const IDLE_ANIMATION_FRAME_INDICES = [0, 20]
const IDLE_ANIMATION_FRAME_DURATIONS = IDLE_ANIMATION_FRAME_INDICES.map((frameIndex, index) =>
	IDLE_FRAME_DURATIONS.slice(frameIndex, IDLE_ANIMATION_FRAME_INDICES[index + 1]).reduce((total, duration) => total + duration, 0))
const SLEEP_FRAME_DURATIONS = Array.from({ length: 8 }, () => 300)
const WAKE_FRAME_DURATIONS = [160, 100, 80, 90, 90, 90, 100, 170]
const TYPING_FRAME_DURATIONS = [320, 480]
const PAINTING_FRAME_DURATIONS = [240, 160, 180, 220, 180, 160, 240, 320]
const BUTTON_PRESS_FRAME_DURATIONS = [500, 300, 350, 250, 450, 1000]
const FALLING_FRAME_DURATIONS = [120, 80, 80, 120, 80, 80]
const JUMP_FRAME_DURATIONS = [70, 80, 90, 160, 100, 100]
const SPLAT_FRAME_DURATIONS = [120, 100, 100, 200]
const RESPAWN_FRAME_DURATIONS = [120, 100, 120, 240, 100, 120]
const SPEECH_FRAME_DURATIONS = [220, 220, 220, 100, 160, 180]
const CLAPPING_FRAME_DURATIONS = [80, 40, 40, 40, 80, 40, 40, 40, 40, 80, 40, 40, 80]
const LOVE_FRAME_DURATIONS = [200, 200, 380, 100, 80, 1980]
const COOL_FRAME_DURATIONS = [600, 120, 120, 120, 160, 80, 80, 80, 1640]
const SING_FRAME_DURATIONS = [180, 180, 180, 180]
const SPEECHLESS_FRAME_DURATIONS = [400, 120, 1000, 120, 1080]
const WORRY_FRAME_DURATIONS = [600, 600]
const DIZZY_FRAME_DURATIONS = Array.from({ length: 8 }, () => 120)
const SEARCH_FRAME_DURATIONS = [500, 500, 500, 500]

const CHAT_PET_SING_FIXED_ORIENTATION_DECORATIONS = [
	{
		frameBounds: [[16, 36, 80, 52], [16, 36, 80, 52], [16, 36, 80, 52], [16, 36, 80, 52]],
		sourceFrame: 0,
	},
	{
		frameBounds: [[96, 8, 160, 72], [96, 4, 160, 68], [100, 0, 164, 64], [92, 4, 156, 68]],
		sourceFrame: 0,
	},
]

const CHAT_PET_VARIANTS = ['stable', 'insiders']
const CHAT_PET_COLOR_PRESETS = [
	{ color: 'stable', key: 'color.stable' },
	{ color: 'insiders', key: 'color.insiders' },
	{ color: '#ff8c00', key: 'color.exploration' },
	{ color: '#e6536f', key: 'color.red' },
	{ color: '#e6c94d', key: 'color.yellow' },
	{ color: '#55b85a', key: 'color.green' },
	{ color: '#a277e6', key: 'color.purple' },
	{ color: '#ed83b5', key: 'color.pink' },
	{ color: '#ffffff', key: 'color.white' },
	{ color: '#000000', key: 'color.black' },
]

const CHAT_PET_ACCESSORIES = {
	grandTopHatMonocle: { id: 'grandTopHatMonocle', atlasName: 'grand-top-hat-monocle', atlasCellSize: 96, eyeAccessoryMirrorsWithFacing: false, coversAntennae: true, key: 'accessory.grandTopHatMonocle' },
	cowboyHat: { id: 'cowboyHat', atlasName: 'cowboy-hat', atlasCellSize: 96, coversAntennae: true, key: 'accessory.cowboyHat' },
	baseballCap: { id: 'baseballCap', atlasName: 'baseball-cap', atlasCellSize: 96, coversAntennae: true, key: 'accessory.baseballCap' },
	constructionHardHat: { id: 'constructionHardHat', atlasName: 'construction-hard-hat', atlasCellSize: 96, coversAntennae: true, key: 'accessory.constructionHardHat' },
	firefighterHelmet: { id: 'firefighterHelmet', atlasName: 'firefighter-helmet', atlasCellSize: 96, coversAntennae: true, key: 'accessory.firefighterHelmet' },
	crown: { id: 'crown', atlasName: 'crown', atlasCellSize: 96, coversAntennae: true, key: 'accessory.crown' },
	propellerHat: { id: 'propellerHat', atlasName: 'propeller-hat', atlasCellSize: 96, coversAntennae: true, key: 'accessory.propellerHat' },
	darkSailorHat: { id: 'darkSailorHat', atlasName: 'dark-sailor-hat', atlasCellSize: 96, coversAntennae: true, key: 'accessory.darkSailorHat' },
	whiteChefHat: { id: 'whiteChefHat', atlasName: 'white-chef-hat', atlasCellSize: 96, coversAntennae: true, key: 'accessory.whiteChefHat' },
	bambooHat: { id: 'bambooHat', atlasName: 'bamboo-hat', atlasCellSize: 96, coversAntennae: true, key: 'accessory.bambooHat' },
	strawHat: { id: 'strawHat', atlasName: 'straw-hat', atlasCellSize: 96, coversAntennae: true, key: 'accessory.strawHat' },
	pinkPartyHat: { id: 'pinkPartyHat', atlasName: 'pink-party-hat', atlasCellSize: 96, coversAntennae: true, key: 'accessory.pinkPartyHat' },
	wizardHat: { id: 'wizardHat', atlasName: 'wizard-hat', atlasCellSize: 96, coversAntennae: true, key: 'accessory.wizardHat' },
}

const CHAT_PET_ACHIEVEMENTS = [
	{ id: 'requestRevision', title: 'Second Draft', description: 'You edited and resent an earlier chat request.', hint: 'An earlier request may deserve a second pass.', accessory: 'grandTopHatMonocle' },
	{ id: 'firstChatMessage', title: 'Welcome to the Wild West', description: 'You sent your first chat message.', hint: 'Every collection starts with a first conversation.', accessory: 'cowboyHat' },
	{ id: 'integratedBrowserShared', title: 'Shared Perspective', description: 'You shared the integrated browser with the agent.', hint: 'Let the agent see what you see in the integrated browser.', accessory: 'baseballCap' },
	{ id: 'modelSwitch', title: 'Model Citizen', description: 'You selected a different model from the model picker.', hint: 'A different model can offer a different perspective.', accessory: 'constructionHardHat' },
	{ id: 'mcpServerPresent', title: 'Server Wrangler', description: 'You configured an MCP server.', hint: 'Connect Chat to a server beyond the editor.', accessory: 'firefighterHelmet' },
	{ id: 'customSkillPresent', title: 'Skilled Builder', description: 'You added a custom skill.', hint: 'Teach Chat a skill of your own.', accessory: 'crown' },
	{ id: 'agentsWindowOpened', title: 'Mission Control', description: 'You opened the Agents window.', hint: 'Some agent work belongs in its own window.', accessory: 'propellerHat' },
	{ id: 'createPullRequest', title: 'Ship it', description: 'You used Create PR in the Agents window.', hint: 'When the changes are ready, send them on their way.', accessory: 'darkSailorHat' },
	{ id: 'agentEditKept', title: 'Let it cook', description: 'You kept a change prepared by Chat.', hint: 'Give a good idea time to come together.', accessory: 'whiteChefHat' },
	{ id: 'agentChangesReviewed', title: 'Trust but Verify', description: 'You opened agent changes for review.', hint: 'Take a closer look before keeping the changes.', accessory: 'bambooHat' },
	{ id: 'chatReferenceOpened', title: 'Follow the Trail', description: 'You opened a file or code reference from Chat.', hint: 'Useful answers often point somewhere worth exploring.', accessory: 'strawHat' },
	{ id: 'usefulOutputCopied', title: 'Copy That', description: 'You copied useful output from Chat.', hint: 'Keep something useful from a chat response.', accessory: 'pinkPartyHat' },
	{ id: 'autopilotEnabled', title: 'Party Mode', description: 'You switched an agent session from Interactive to Autopilot.', hint: 'Some work is ready to carry on with less steering.', accessory: 'wizardHat' },
	{ id: 'blobby', title: 'True Name', description: 'Blob the Builder? Blobby McBlobface? Nope, my name is Blobby.', hint: 'This little blob has a name. Try calling it in Chat.', accessory: null, colorCustomization: true },
]

const CHAT_PET_UNLOCKED_BY_DEFAULT = CHAT_PET_ACHIEVEMENTS
	.filter(achievement => achievement.id !== 'blobby')
	.map(achievement => achievement.id)

const CHAT_PET_SPRITE_SPEC = {
	idle: { name: 'buddy-idle', tracking: true, width: 96, height: 96, durations: IDLE_FRAME_DURATIONS, frameIndices: IDLE_ANIMATION_FRAME_INDICES, frameDurations: IDLE_ANIMATION_FRAME_DURATIONS, iterations: Infinity },
	rendering: { name: 'buddy-rendering', tracking: true, width: 96, height: 96, durations: IDLE_FRAME_DURATIONS, frameIndices: IDLE_ANIMATION_FRAME_INDICES, frameDurations: IDLE_ANIMATION_FRAME_DURATIONS, iterations: Infinity },
	achievementUnlocked: { name: 'buddy-rendering', tracking: true, width: 96, height: 96, durations: IDLE_FRAME_DURATIONS, frameIndices: IDLE_ANIMATION_FRAME_INDICES, frameDurations: IDLE_ANIMATION_FRAME_DURATIONS, iterations: Infinity },
	clapping: { name: 'buddy-clapping', tracking: true, width: 96, height: 96, durations: CLAPPING_FRAME_DURATIONS, iterations: Infinity },
	typing: { name: 'buddy-typing', tracking: false, width: 168, height: 96, durations: TYPING_FRAME_DURATIONS, iterations: Infinity },
	painting: { name: 'buddy-painting', tracking: false, width: 192, height: 96, durations: PAINTING_FRAME_DURATIONS, iterations: Infinity },
	buttonPress: { name: 'buddy-press-button', tracking: false, width: 160, height: 96, durations: BUTTON_PRESS_FRAME_DURATIONS, iterations: 1 },
	love: { name: 'buddy-love', tracking: false, width: 96, height: 96, durations: LOVE_FRAME_DURATIONS, iterations: Infinity },
	cool: { name: 'buddy-cool', tracking: false, width: 96, height: 96, durations: COOL_FRAME_DURATIONS, iterations: 1 },
	sing: { name: 'buddy-sing', tracking: false, width: 164, height: 124, durations: SING_FRAME_DURATIONS, iterations: Infinity, fixedDecorations: CHAT_PET_SING_FIXED_ORIENTATION_DECORATIONS },
	speechless: { name: 'buddy-speechless', tracking: false, width: 96, height: 96, durations: SPEECHLESS_FRAME_DURATIONS, iterations: Infinity },
	worry: { name: 'buddy-worry', tracking: false, width: 96, height: 96, durations: WORRY_FRAME_DURATIONS, iterations: Infinity },
	dizzy: { name: 'buddy-dizzy', tracking: false, width: 96, height: 128, durations: DIZZY_FRAME_DURATIONS, iterations: Infinity },
	yapping: { name: 'buddy-yapping', tracking: false, width: 96, height: 96, durations: [], iterations: 1, staticOnly: true },
	yappingMouthOpen: { name: 'buddy-yapping', tracking: false, width: 96, height: 96, durations: [], iterations: 1, staticOnly: true },
	jump: { name: 'buddy-jump', tracking: false, width: 96, height: 96, durations: JUMP_FRAME_DURATIONS, iterations: 1 },
	falling: { name: 'buddy-falling', tracking: false, width: 96, height: 96, durations: FALLING_FRAME_DURATIONS, iterations: Infinity },
	wallImpact: { name: 'buddy-wall-impact', tracking: false, width: 96, height: 96, durations: [], iterations: 1, staticOnly: true },
	splat: { name: 'buddy-splat', tracking: false, width: 96, height: 96, durations: SPLAT_FRAME_DURATIONS, iterations: 1 },
	sleep: { name: 'buddy-sleep', tracking: false, width: 120, height: 96, durations: SLEEP_FRAME_DURATIONS, iterations: Infinity },
	waking: { name: 'buddy-waking', tracking: false, width: 120, height: 96, durations: WAKE_FRAME_DURATIONS, iterations: 1 },
	onTheRun: { name: 'buddy-search', tracking: false, width: 96, height: 96, durations: [], iterations: 1, staticOnly: true },
	searching: { name: 'buddy-search', tracking: false, width: 96, height: 96, durations: SEARCH_FRAME_DURATIONS, iterations: 1 },
	searchingDown: { name: 'buddy-search', tracking: false, width: 96, height: 96, durations: [], iterations: 1, staticOnly: true },
	complete: { name: 'buddy-idle', tracking: true, width: 96, height: 96, durations: IDLE_FRAME_DURATIONS, frameIndices: IDLE_ANIMATION_FRAME_INDICES, frameDurations: IDLE_ANIMATION_FRAME_DURATIONS, iterations: Infinity },
}

const CHAT_PET_REDUCED_MOTION_RIG_FRAME = {
	sleep: 4, waking: 7, buttonPress: 4, painting: 3, love: 5, splat: 3,
}

const CHAT_PET_STORAGE_KEY = 'dsh.vscode-pet.prefs.v1'
const CHAT_PET_JUMP_HIGH_SCORE_KEY = 'dsh.vscode-pet.jumpHighScore'
const CHAT_PET_DEBUG_KEY = 'dsh.vscode-pet.debug'

const CHAT_PET_DEFAULT_PREFS = {
	v: 1,
	visible: true,
	color: 'insiders',
	accessory: null,
	scale: 1,
	horizontal: { edge: 'right', inset: CHAT_PET_DEFAULT_RIGHT_INSET },
	onTheRun: false,
	achievementSeen: [],
	trueNameUnlocked: false,
	jumpHighScore: 0,
}
