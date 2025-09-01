package main

import "fmt"

var (
	Version = "dev"
)

func PrintVersion() {
	fmt.Printf("gfarm-http %s \n", Version)
}
