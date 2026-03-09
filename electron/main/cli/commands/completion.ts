/**
 * Completion command handler - generates shell completion scripts
 */
import { printCommandHelp } from '../help';
import type { CommandContext, CommandResult } from '../types';

const BASH_COMPLETION = `_oclaw_completion() {
  local cur prev commands
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"

  commands="start stop restart logs status st control web repair fix runtime rt provider pv channel ch skill sk server srv ps openclaw oc gateway gw cron cr chat ct clawhub hub uv completion help"

  if [ $COMP_CWORD -eq 1 ]; then
    COMPREPLY=( $(compgen -W "$commands --help --version --json --verbose --quiet" -- "$cur") )
    return 0
  fi

  case "$prev" in
    web)
      COMPREPLY=( $(compgen -W "control" -- "$cur") )
      ;;
    runtime|rt|openclaw|oc)
      COMPREPLY=( $(compgen -W "status repair version paths logs exec" -- "$cur") )
      ;;
    provider|pv)
      COMPREPLY=( $(compgen -W "list get add update remove set-key remove-key has-key get-key default current save delete delete-key set-default get-default" -- "$cur") )
      ;;
    channel|ch)
      COMPREPLY=( $(compgen -W "list get add update remove enable disable validate get-form save delete validate-credentials" -- "$cur") )
      ;;
    skill|sk)
      COMPREPLY=( $(compgen -W "list status enable disable config set list-config get-config update-config" -- "$cur") )
      ;;
    server|srv)
      COMPREPLY=( $(compgen -W "start status restart" -- "$cur") )
      ;;
    gateway|gw)
      COMPREPLY=( $(compgen -W "status start stop restart health rpc" -- "$cur") )
      ;;
    cron|cr)
      COMPREPLY=( $(compgen -W "list create update delete toggle trigger" -- "$cur") )
      ;;
    chat|ct)
      COMPREPLY=( $(compgen -W "sessions history send abort" -- "$cur") )
      ;;
    clawhub|hub)
      COMPREPLY=( $(compgen -W "search explore install uninstall list" -- "$cur") )
      ;;
    uv)
      COMPREPLY=( $(compgen -W "check install-all" -- "$cur") )
      ;;
    completion)
      COMPREPLY=( $(compgen -W "bash zsh" -- "$cur") )
      ;;
  esac
}

complete -F _oclaw_completion oclaw
`;

const ZSH_COMPLETION = `#compdef oclaw

_oclaw() {
  local -a commands
  commands=(
    'start:Start the embedded OpenClaw service'
    'stop:Stop the embedded OpenClaw service'
    'restart:Restart the embedded OpenClaw service'
    'logs:Show OpenClaw service logs'
    'status:Show runtime summary'
    'st:Alias for status'
    'control:Open the OpenClaw control UI'
    'web:Compatibility alias for control'
    'repair:Repair the embedded OpenClaw runtime'
    'fix:Alias for repair'
    'runtime:Operate the embedded OpenClaw runtime directly'
    'rt:Alias for runtime'
    'provider:Manage model providers'
    'pv:Alias for provider'
    'channel:Manage channel configuration'
    'ch:Alias for channel'
    'skill:Manage installed skills and config'
    'sk:Alias for skill'
    'server:Compatibility entry for start/status/restart'
    'srv:Alias for server'
    'ps:Compatibility instance listing'
    'gateway:Legacy gateway controls'
    'gw:Alias for gateway'
    'openclaw:Compatibility runtime entry'
    'oc:Alias for openclaw'
    'cron:Manage scheduled jobs'
    'cr:Alias for cron'
    'chat:Chat sessions and messages'
    'ct:Alias for chat'
    'clawhub:Legacy skill marketplace commands'
    'hub:Alias for clawhub'
    'uv:Check/install uv and Python'
    'completion:Generate shell completion scripts'
    'help:Show help'
  )

  _arguments -C \
    '(--help -h)'{--help,-h}'[Show help]' \
    '(--version -v)'{--version,-v}'[Show version]' \
    '--json[Output as JSON]' \
    '--verbose[Show debug logs]' \
    '--quiet[Minimal output]' \
    '1: :->command' \
    '*::arg:->args'

  case $state in
    command)
      _describe 'command' commands
      ;;
    args)
      case $words[1] in
        web)
          _arguments '1: :(control)'
          ;;
        runtime|rt|openclaw|oc)
          _arguments '1: :(status repair version paths logs exec)'
          ;;
        provider|pv)
          _arguments '1: :(list get add update remove set-key remove-key has-key get-key default current save delete delete-key set-default get-default)'
          ;;
        channel|ch)
          _arguments '1: :(list get add update remove enable disable validate get-form save delete validate-credentials)'
          ;;
        skill|sk)
          _arguments '1: :(list status enable disable config set list-config get-config update-config)'
          ;;
        server|srv)
          _arguments '1: :(start status restart)'
          ;;
        gateway|gw)
          _arguments '1: :(status start stop restart health rpc)'
          ;;
        cron|cr)
          _arguments '1: :(list create update delete toggle trigger)'
          ;;
        chat|ct)
          _arguments '1: :(sessions history send abort)'
          ;;
        clawhub|hub)
          _arguments '1: :(search explore install uninstall list)'
          ;;
        uv)
          _arguments '1: :(check install-all)'
          ;;
        completion)
          _arguments '1: :(bash zsh)'
          ;;
      esac
      ;;
  esac
}

_oclaw
`;

export async function handleCompletion(ctx: CommandContext): Promise<CommandResult> {
  const [shell] = ctx.args;

  if (!shell || shell === '--help' || shell === '-h') {
    printCommandHelp('completion');
    return { data: undefined };
  }

  switch (shell) {
    case 'bash':
      return { data: BASH_COMPLETION };
    case 'zsh':
      return { data: ZSH_COMPLETION };
    default:
      throw new Error('Usage: completion <bash|zsh>');
  }
}
