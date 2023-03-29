import { App, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { spawnSync} from "child_process";

interface RemarkablePluginSettings {
	fileToSync: string;
	nodePath: string;
	md2pdfPath: string;
	rmapiPath: string;
}

const DEFAULT_SETTINGS: RemarkablePluginSettings = {
	fileToSync: 'default',
	nodePath: '$HOME/node/bin/node',
	md2pdfPath: '$HOME/node/bin/node/md-to-pdf',
	rmapiPath: '$HOME/go/bin/rmapi',

}

export default class RemarkablePlugin extends Plugin {
	settings: RemarkablePluginSettings;
	//@ts-ignore
	vaultDirectory = this.app.vault.adapter.basePath

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		this.addRibbonIcon('cloud-cog', 'reMarkable Plugin', () => {
			this.convertToPdf().then(() => {
				new Notice('Converted to PDF successfully')
				this.uploadToRemarkable()
					.then(() => {
						new Notice('Upload to reMarkable successful!');
					})
					.catch((e) => {
						new Notice("Failed to upload to reMarkable." + e)
					})
			}).catch((e) => {
				new Notice('Failed to convert to PDF.' + e)
			})
		});

		this.addSettingTab(new SampleSettingTab(this.app, this));

	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async convertToPdf() {

		const command = this.settings.nodePath;
		const args = [this.settings.md2pdfPath, `${this.vaultDirectory}/${this.settings.fileToSync}.md`];

		const result = spawnSync(command, args);

		console.log(this.settings.md2pdfPath)

		if (result.error) {
			throw Error(`${result.error.message}`);
		}
		if (result.stderr.length > 0) {
			throw Error(`stderr: ${result.stderr}`);
		}
		console.log(`stdout: ${result.stdout}`);

	}
	async uploadToRemarkable() {
		const result = spawnSync(
			`${this.settings.rmapiPath} put ${this.vaultDirectory}/${this.settings.fileToSync}.pdf`,
			{shell: true}
		)
		if (result.error) {
			throw Error(`${result.error.message}`);
		}
		if (result.stderr.length > 0) {
			throw Error(`stderr: ${result.stderr}`);
		}
		console.log(`stdout: ${result.stdout}`);
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: RemarkablePlugin;

	constructor(app: App, plugin: RemarkablePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings'});

		new Setting(containerEl)
			.setName('File to sync')
			.setDesc('The file that is synced to reMarkable')
			.addText(text => text
				.setPlaceholder('Enter the path to the file from the vault root')
				.setValue(this.plugin.settings.fileToSync)
				.onChange(async (value) => {
					this.plugin.settings.fileToSync = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Node path')
			.setDesc('Absolute path to Node on your system, e.g. the output of `which node`')
			.addText(text => text
				.setPlaceholder('Enter the absolute path to Node')
				.setValue(this.plugin.settings.nodePath)
				.onChange(async (value) => {
					this.plugin.settings.nodePath = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('md-to-pdf')
			.setDesc('Absolute path to md-to-pdf on your system, e.g. the output of `which md-to-pdf`')
			.addText(text => text
				.setPlaceholder('Enter the absolute path to md-to-pdf')
				.setValue(this.plugin.settings.md2pdfPath)
				.onChange(async (value) => {
					this.plugin.settings.md2pdfPath = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('rmapi')
			.setDesc('Absolute path to rmapi on your system, e.g. the output of `which rmapi`')
			.addText(text => text
				.setPlaceholder('Enter the absolute path to rmapi')
				.setValue(this.plugin.settings.rmapiPath)
				.onChange(async (value) => {
					this.plugin.settings.rmapiPath = value;
					await this.plugin.saveSettings();
				}));

	}
}
