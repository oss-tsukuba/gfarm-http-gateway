package main

import (
	"crypto/tls"
	"net/http"
	"os"
)

func main() {
	insecure, verbose, rest, showVersion := parseGlobal()
	if showVersion {
		PrintVersion()
		return
	}
	if len(rest) == 0 {
		showRootHelp()
		os.Exit(1)
	}
	command := rest[0]
	args := rest[1:]

	tr := &http.Transport{
		Proxy: http.ProxyFromEnvironment,
	}
	if insecure {
		tr.TLSClientConfig = &tls.Config{InsecureSkipVerify: true} //nolint:gosec
	}
	httpClient := &http.Client{Transport: tr}

	client := NewClient(mustBaseURL(), verbose, insecure, httpClient)

	execCommand(client, command, args)
}
